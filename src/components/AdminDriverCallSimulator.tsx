import React, { useEffect, useState } from 'react';
import {
  BellRing,
  Car,
  CheckCircle2,
  KeyRound,
  MapPin,
  Navigation,
  RefreshCw,
  RotateCcw,
  Star,
  Users,
  Volume2,
  XCircle,
} from 'lucide-react';
import { MapRealtime } from './MapRealtime';
import { LocationPoint, RideStatus } from '../types';
import {
  cancelVoiceSpeech,
  notifyNewIncomingRide,
  notifyRideFinished,
  playChimeSound,
} from '../services/audioNotificationService';
import {
  calculateRideSplitForDriver,
  isDriverInLaunchZeroFeePromo,
} from '../services/promoService';

interface AdminDriverCallSimulatorProps {
  onOpenAllDrivers: () => void;
}

interface SimulatedCallData {
  id: string;
  passengerName: string;
  passengerRating: number;
  passengerAvatar: string;
  pickup: LocationPoint;
  destination: LocationPoint;
  price: number;
  paymentLabel: string;
  distanceKm: string;
  etaMinutes: number;
  confirmationCode: string;
}

type SimPhase = 'idle' | 'ringing' | 'accepted' | 'in_progress' | 'finished';

const PASSENGER_PORTRAIT_DATA_URL = `data:image/svg+xml;utf8,${encodeURIComponent(
  `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 160 160">
    <defs>
      <linearGradient id="bg" x1="0" y1="0" x2="1" y2="1">
        <stop offset="0%" stop-color="#0ea5e9"/>
        <stop offset="100%" stop-color="#10b981"/>
      </linearGradient>
    </defs>
    <rect width="160" height="160" rx="80" fill="url(#bg)"/>
    <circle cx="80" cy="60" r="28" fill="#fde68a"/>
    <path d="M52 56c0-20 14-34 28-34s28 14 28 34c-4-10-14-14-28-14s-24 4-28 14z" fill="#1e293b"/>
    <circle cx="70" cy="61" r="3" fill="#0f172a"/>
    <circle cx="90" cy="61" r="3" fill="#0f172a"/>
    <path d="M71 73c5 5 13 5 18 0" stroke="#92400e" stroke-width="3" stroke-linecap="round" fill="none"/>
    <path d="M34 150c6-30 24-44 46-44s40 14 46 44" fill="#ffffff"/>
    <path d="M62 108l18 16 18-16" fill="#0284c7"/>
  </svg>`
)}`;

const SAMPLE_CALLS: Omit<SimulatedCallData, 'id' | 'confirmationCode'>[] = [
  {
    passengerName: 'Ana Paula Silva',
    passengerRating: 4.9,
    passengerAvatar: PASSENGER_PORTRAIT_DATA_URL,
    pickup: {
      address: 'Parque Ecológico — Av. Eng. Fábio Roberto Barnabé, 1500, Indaiatuba',
      lat: -23.0912,
      lng: -47.2174,
    },
    destination: {
      address: 'Polo Shopping Indaiatuba — Alameda Filtros Mann, 670, Indaiatuba',
      lat: -23.1116,
      lng: -47.2111,
    },
    price: 24.5,
    paymentLabel: 'PIX',
    distanceKm: '4,8 km',
    etaMinutes: 9,
  },
  {
    passengerName: 'Mariana Costa',
    passengerRating: 5.0,
    passengerAvatar: PASSENGER_PORTRAIT_DATA_URL,
    pickup: {
      address: 'Praça Prudente de Moraes, 120 — Centro, Indaiatuba',
      lat: -23.0886,
      lng: -47.2143,
    },
    destination: {
      address: 'Hospital Augusto de Oliveira Camargo (HAOC) — Av. Francisco de Paula Leite, 399',
      lat: -23.0992,
      lng: -47.2245,
    },
    price: 18.0,
    paymentLabel: 'DINHEIRO',
    distanceKm: '3,2 km',
    etaMinutes: 7,
  },
];

const formatBRL = (value: number): string =>
  value.toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' });

export const AdminDriverCallSimulator: React.FC<AdminDriverCallSimulatorProps> = ({
  onOpenAllDrivers,
}) => {
  const [phase, setPhase] = useState<SimPhase>('idle');
  const [callIndex, setCallIndex] = useState(0);
  const [simulatedCall, setSimulatedCall] = useState<SimulatedCallData | null>(null);
  const [codeInput, setCodeInput] = useState('');
  const [codeError, setCodeError] = useState<string | null>(null);
  const [statusNotice, setStatusNotice] = useState<string | null>(null);

  const isPromoZeroFee = isDriverInLaunchZeroFeePromo();

  useEffect(() => {
    const t = setTimeout(() => {
      window.dispatchEvent(new Event('resize'));
    }, 120);
    return () => {
      clearTimeout(t);
    };
  }, [phase]);

  useEffect(() => {
    return () => {
      cancelVoiceSpeech();
    };
  }, []);

  const handleSimulateIncomingCall = () => {
    const template = SAMPLE_CALLS[callIndex % SAMPLE_CALLS.length];
    const randomCode = String(Math.floor(1000 + Math.random() * 9000));
    const nextCall: SimulatedCallData = {
      ...template,
      id: `SIM-${Date.now().toString().slice(-4)}`,
      confirmationCode: randomCode,
    };

    setCallIndex((prev) => prev + 1);
    setSimulatedCall(nextCall);
    setCodeInput('');
    setCodeError(null);
    setStatusNotice(null);
    setPhase('ringing');

    // Toca o mesmo som e aviso de voz que o motorista escuta ao chegar corrida
    notifyNewIncomingRide();
  };

  const handleAcceptCall = () => {
    if (!simulatedCall) return;
    cancelVoiceSpeech();
    playChimeSound();
    setCodeInput('');
    setCodeError(null);
    setStatusNotice('Corrida aceita! Digite o código de 4 dígitos do passageiro para iniciar.');
    setPhase('accepted');
  };

  const handleRejectCall = () => {
    cancelVoiceSpeech();
    setSimulatedCall(null);
    setCodeInput('');
    setCodeError(null);
    setPhase('idle');
    setStatusNotice('Chamada recusada. Clique em "Simular chamada de corrida" para testar novamente.');
  };

  const handleVerifyCodeAndStart = () => {
    if (!simulatedCall) return;
    const clean = codeInput.replace(/\D/g, '');
    if (clean.length !== 4) {
      setCodeError('Digite os 4 dígitos do código informado pelo passageiro.');
      return;
    }
    if (clean !== simulatedCall.confirmationCode) {
      setCodeError(`Código incorreto. Para este teste, informe ${simulatedCall.confirmationCode}.`);
      return;
    }
    setCodeError(null);
    playChimeSound();
    setStatusNotice('Código confirmado! Corrida iniciada — siga pelo mapa até o destino e clique em Finalizar.');
    setPhase('in_progress');
  };

  const handleFinishRide = () => {
    if (!simulatedCall) return;
    if (phase === 'accepted') {
      const clean = codeInput.replace(/\D/g, '');
      if (clean !== simulatedCall.confirmationCode) {
        setCodeError(
          `Confirme primeiro o código de 4 dígitos (${simulatedCall.confirmationCode}) para começar e finalizar a corrida.`
        );
        return;
      }
    }
    setCodeError(null);
    notifyRideFinished();
    setPhase('finished');
    setStatusNotice('Corrida finalizada com sucesso na simulação!');
  };

  const handleResetSimulation = () => {
    cancelVoiceSpeech();
    setSimulatedCall(null);
    setCodeInput('');
    setCodeError(null);
    setStatusNotice(null);
    setPhase('idle');
  };

  const split = simulatedCall
    ? calculateRideSplitForDriver(simulatedCall.price)
    : calculateRideSplitForDriver(24.5);

  const mapRideStatus: RideStatus =
    phase === 'in_progress'
      ? 'in_progress'
      : phase === 'accepted'
      ? 'accepted'
      : phase === 'ringing'
      ? 'searching'
      : 'idle';

  return (
    <div className="max-w-3xl mx-auto space-y-4">
      {/* Barra superior: botão Simular chamada de corrida (sem perfil de ADM, sem Meu Painel Condutor) */}
      <div className="bg-slate-950 text-white border border-emerald-500/50 rounded-3xl p-4 sm:p-5 shadow-md flex flex-col sm:flex-row sm:items-center justify-between gap-3">
        <div className="flex items-center gap-3">
          <div className="w-11 h-11 rounded-2xl bg-emerald-500/20 border border-emerald-400/40 text-emerald-400 flex items-center justify-center shrink-0">
            <BellRing className="w-6 h-6" />
          </div>
          <div>
            <h3 className="font-heading font-black text-base sm:text-lg text-white">
              Ver como Motorista — Chamada de Corrida
            </h3>
            <p className="text-xs text-zinc-300 font-medium">
              Teste exatamente como o motorista recebe o chamado, aceita, valida o código de 4 dígitos e finaliza.
            </p>
          </div>
        </div>

        <div className="flex items-center gap-2 flex-wrap">
          <button
            type="button"
            onClick={handleSimulateIncomingCall}
            className="flex-1 sm:flex-none px-4 py-2.5 rounded-xl bg-emerald-600 hover:bg-emerald-500 active:scale-95 text-white font-heading font-black text-xs sm:text-sm cursor-pointer shadow-md flex items-center justify-center gap-2 transition-all"
          >
            <Volume2 className="w-4 h-4 shrink-0" />
            <span>Simular chamada de corrida</span>
          </button>
          <button
            type="button"
            onClick={onOpenAllDrivers}
            className="px-3.5 py-2.5 rounded-xl bg-zinc-800 hover:bg-zinc-700 text-zinc-200 border border-zinc-700 font-heading font-black text-xs cursor-pointer flex items-center justify-center gap-1.5"
          >
            <Users className="w-4 h-4 shrink-0" />
            <span>Todos os Motoristas</span>
          </button>
        </div>
      </div>

      {/* Aviso de feedback da simulação */}
      {statusNotice && (
        <div className="bg-emerald-50 border border-emerald-300 text-emerald-950 rounded-2xl px-4 py-3 text-xs sm:text-sm font-bold flex items-center justify-between gap-2 shadow-xs">
          <div className="flex items-center gap-2">
            <CheckCircle2 className="w-4 h-4 text-emerald-600 shrink-0" />
            <span>{statusNotice}</span>
          </div>
          <button
            type="button"
            onClick={() => setStatusNotice(null)}
            className="text-emerald-700 hover:text-emerald-950 font-black cursor-pointer px-1"
          >
            ✕
          </button>
        </div>
      )}

      {/* TELA 1: CHAMADA CHEGANDO (EXATAMENTE IGUAL O MOTORISTA ENXERGA) */}
      {phase === 'ringing' && simulatedCall && (
        <div className="bg-zinc-950 text-white border-4 border-emerald-500 rounded-3xl p-5 sm:p-6 shadow-2xl space-y-4 animate-fade-in">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 border-b border-zinc-800 pb-3">
            <div className="flex items-center gap-2.5">
              <span className="w-4 h-4 rounded-full bg-emerald-400 animate-ping shrink-0" />
              <span className="text-lg sm:text-2xl font-heading font-black text-emerald-400 tracking-wide">
                Nova corrida! {formatBRL(split.driverEarnings)} para você
              </span>
            </div>
            <span className="text-xs font-mono font-black bg-amber-500/20 text-amber-300 border border-amber-500/50 px-3 py-1 rounded-full self-start sm:self-center">
              Pagamento: {simulatedCall.paymentLabel} •{' '}
              {isPromoZeroFee ? '100% seu até 17/12' : `${split.driverSharePercent}% seu`}
            </span>
          </div>

          {simulatedCall.paymentLabel === 'DINHEIRO' && (
            <div className="bg-emerald-600 text-white rounded-2xl px-4 py-3 text-center font-heading font-black text-base sm:text-lg shadow-md">
              Receber {formatBRL(simulatedCall.price)} em dinheiro no final da corrida
            </div>
          )}

          {/* Foto do passageiro + Valor em destaque */}
          <div className="bg-zinc-900 border border-zinc-800 rounded-2xl p-4 space-y-3.5">
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 border-b border-zinc-800 pb-3.5">
              <div className="flex items-center gap-3.5 min-w-0">
                <img
                  src={simulatedCall.passengerAvatar}
                  alt={simulatedCall.passengerName}
                  className="w-16 h-16 sm:w-20 sm:h-20 rounded-full object-cover border-3 border-emerald-400 shadow-lg shrink-0 bg-zinc-800"
                />
                <div className="min-w-0">
                  <span className="text-[10px] font-mono font-bold uppercase text-emerald-400 tracking-wider block">
                    Passageiro Chamando
                  </span>
                  <p className="font-heading font-black text-lg sm:text-xl text-white truncate">
                    {simulatedCall.passengerName}
                  </p>
                  <div className="flex items-center gap-2 mt-0.5 text-xs text-zinc-300 font-bold">
                    <span className="inline-flex items-center gap-1 text-amber-400">
                      <Star className="w-3.5 h-3.5 fill-amber-400 text-amber-400" />
                      {simulatedCall.passengerRating.toFixed(1)}
                    </span>
                    <span>•</span>
                    <span>{simulatedCall.distanceKm}</span>
                    <span>•</span>
                    <span>{simulatedCall.etaMinutes} min</span>
                  </div>
                </div>
              </div>

              <div className="text-left sm:text-right bg-zinc-950 border border-emerald-500/40 rounded-2xl px-4 py-2.5 shrink-0">
                <span className="text-[10px] font-mono font-bold uppercase text-zinc-400 block">
                  Valor da Corrida
                </span>
                <span className="text-2xl sm:text-3xl font-heading font-black text-emerald-400 block">
                  {formatBRL(split.driverEarnings)}
                </span>
                <span className="text-[11px] font-mono font-bold text-amber-300 block">
                  {isPromoZeroFee
                    ? '100% Motorista • 0% Race até 17/12'
                    : `85% Motorista • 15% Race`}
                </span>
              </div>
            </div>

            {/* Origem e Destino */}
            <div className="space-y-2.5 text-sm">
              <div className="flex items-start gap-2.5">
                <div className="w-7 h-7 rounded-lg bg-emerald-500/20 border border-emerald-400/50 text-emerald-400 flex items-center justify-center shrink-0 mt-0.5">
                  <MapPin className="w-4 h-4" />
                </div>
                <div>
                  <span className="text-[10px] font-mono font-bold uppercase text-emerald-400 block">
                    Origem (Embarque)
                  </span>
                  <p className="text-zinc-100 font-semibold leading-snug">
                    {simulatedCall.pickup.address}
                  </p>
                </div>
              </div>

              <div className="flex items-start gap-2.5">
                <div className="w-7 h-7 rounded-lg bg-[#ff6a00]/20 border border-[#ff6a00]/50 text-[#ff6a00] flex items-center justify-center shrink-0 mt-0.5">
                  <Navigation className="w-4 h-4" />
                </div>
                <div>
                  <span className="text-[10px] font-mono font-bold uppercase text-[#ff6a00] block">
                    Destino (Chegada)
                  </span>
                  <p className="text-zinc-100 font-semibold leading-snug">
                    {simulatedCall.destination.address}
                  </p>
                </div>
              </div>
            </div>
          </div>

          {/* Botão Aceitar (verde) e Recusar (vermelho) */}
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
            <button
              type="button"
              onClick={handleAcceptCall}
              className="sm:col-span-2 min-h-[64px] bg-emerald-600 hover:bg-emerald-500 active:scale-95 text-white font-heading font-black text-xl sm:text-2xl rounded-2xl shadow-xl border-2 border-emerald-400 flex items-center justify-center gap-3 cursor-pointer transition-all uppercase tracking-wider"
            >
              <CheckCircle2 className="w-7 h-7 shrink-0" />
              <span>Aceitar</span>
            </button>
            <button
              type="button"
              onClick={handleRejectCall}
              className="min-h-[64px] bg-rose-600 hover:bg-rose-500 active:scale-95 text-white font-heading font-black text-lg rounded-2xl shadow-lg border-2 border-rose-400 flex items-center justify-center gap-2 cursor-pointer transition-all uppercase"
            >
              <XCircle className="w-6 h-6 shrink-0" />
              <span>Recusar</span>
            </button>
          </div>
        </div>
      )}

      {/* TELA 2: APÓS ACEITAR — CÓDIGO DE 4 DÍGITOS PARA COMEÇAR + BOTÃO FINALIZAR */}
      {(phase === 'accepted' || phase === 'in_progress') && simulatedCall && (
        <div className="bg-white border-2 border-emerald-500 rounded-3xl p-5 sm:p-6 shadow-xl space-y-4">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 pb-3 border-b border-slate-200">
            <div className="flex items-center gap-3">
              <img
                src={simulatedCall.passengerAvatar}
                alt={simulatedCall.passengerName}
                className="w-14 h-14 rounded-full object-cover border-2 border-emerald-500 shrink-0"
              />
              <div>
                <span className="text-[11px] font-mono font-black uppercase px-2.5 py-0.5 rounded-full bg-emerald-100 text-emerald-800 border border-emerald-300 inline-block">
                  {phase === 'in_progress'
                    ? '🚗 Corrida em Andamento'
                    : '✅ Corrida Aceita — A caminho do embarque'}
                </span>
                <h4 className="font-heading font-black text-slate-950 text-lg mt-1">
                  {simulatedCall.passengerName}
                </h4>
              </div>
            </div>
            <div className="text-left sm:text-right">
              <span className="text-2xl font-heading font-black text-emerald-700 block">
                {formatBRL(split.driverEarnings)}
              </span>
              <span className="text-xs font-mono font-bold text-slate-500">
                {isPromoZeroFee ? '100% seu até 17/12' : '85% seu'} • {simulatedCall.paymentLabel}
              </span>
            </div>
          </div>

          <div className="bg-slate-50 border border-slate-200 rounded-2xl p-3.5 text-xs sm:text-sm space-y-2">
            <p className="text-slate-800 font-semibold">
              <strong className="text-emerald-700">Origem:</strong> {simulatedCall.pickup.address}
            </p>
            <p className="text-slate-800 font-semibold">
              <strong className="text-[#ff6a00]">Destino:</strong> {simulatedCall.destination.address}
            </p>
          </div>

          {/* Código de 4 dígitos para iniciar a corrida */}
          <div
            className={`rounded-2xl p-4 border-2 space-y-3 ${
              phase === 'in_progress'
                ? 'bg-emerald-50 border-emerald-400'
                : 'bg-amber-50 border-amber-400'
            }`}
          >
            <div className="flex items-center justify-between gap-2 flex-wrap">
              <div className="flex items-center gap-2">
                <KeyRound className="w-5 h-5 text-slate-900 shrink-0" />
                <span className="font-heading font-black text-slate-950 text-sm sm:text-base">
                  Código de 4 dígitos para começar
                </span>
              </div>
              <span className="text-xs font-mono font-black bg-slate-950 text-amber-300 px-3 py-1 rounded-xl">
                Código do passageiro (teste): {simulatedCall.confirmationCode}
              </span>
            </div>

            {phase === 'accepted' ? (
              <div className="flex flex-col sm:flex-row items-stretch sm:items-center gap-2.5">
                <input
                  type="text"
                  inputMode="numeric"
                  maxLength={4}
                  value={codeInput}
                  onChange={(e) => {
                    setCodeInput(e.target.value.replace(/\D/g, '').slice(0, 4));
                    if (codeError) setCodeError(null);
                  }}
                  placeholder="Digite os 4 dígitos"
                  className="flex-1 bg-white border-2 border-slate-300 focus:border-[#ff6a00] rounded-xl px-4 py-3 text-center font-mono font-black text-xl tracking-[0.35em] text-slate-950 focus:outline-none"
                />
                <button
                  type="button"
                  onClick={handleVerifyCodeAndStart}
                  className="px-5 py-3.5 rounded-xl bg-slate-950 hover:bg-slate-800 text-amber-300 font-heading font-black text-sm uppercase cursor-pointer shadow-md transition-all active:scale-95"
                >
                  Confirmar e Começar
                </button>
              </div>
            ) : (
              <p className="text-xs sm:text-sm font-bold text-emerald-800 flex items-center gap-2">
                <CheckCircle2 className="w-4 h-4 text-emerald-600 shrink-0" />
                <span>Código {simulatedCall.confirmationCode} confirmado! Viagem em andamento até o destino.</span>
              </p>
            )}

            {codeError && (
              <p className="text-xs font-bold text-rose-700 bg-rose-50 border border-rose-200 rounded-xl px-3 py-2">
                {codeError}
              </p>
            )}
          </div>

          {/* Botão Finalizar Corrida */}
          <div className="flex flex-col sm:flex-row items-stretch sm:items-center gap-2.5 pt-1">
            <button
              type="button"
              onClick={handleFinishRide}
              className={`flex-1 min-h-[56px] rounded-2xl font-heading font-black text-base sm:text-lg uppercase tracking-wider flex items-center justify-center gap-2 transition-all cursor-pointer shadow-lg ${
                phase === 'in_progress'
                  ? 'bg-emerald-600 hover:bg-emerald-500 text-white border-2 border-emerald-400 active:scale-95'
                  : 'bg-emerald-600/85 hover:bg-emerald-600 text-white border-2 border-emerald-400'
              }`}
            >
              <CheckCircle2 className="w-6 h-6 shrink-0" />
              <span>Finalizar Corrida</span>
            </button>
            <button
              type="button"
              onClick={handleResetSimulation}
              className="px-4 py-3.5 rounded-2xl bg-slate-100 hover:bg-slate-200 text-slate-700 border border-slate-300 font-heading font-black text-xs sm:text-sm cursor-pointer flex items-center justify-center gap-1.5"
            >
              <RotateCcw className="w-4 h-4" />
              <span>Cancelar Teste</span>
            </button>
          </div>
        </div>
      )}

      {/* TELA 3: CORRIDA FINALIZADA */}
      {phase === 'finished' && simulatedCall && (
        <div className="bg-emerald-950 text-white border-2 border-emerald-400 rounded-3xl p-6 text-center space-y-4 shadow-xl">
          <div className="w-16 h-16 rounded-full bg-emerald-500/20 border-2 border-emerald-400 text-emerald-300 flex items-center justify-center mx-auto">
            <CheckCircle2 className="w-9 h-9" />
          </div>
          <div className="space-y-1">
            <h4 className="font-heading font-black text-xl sm:text-2xl text-white">
              Corrida Finalizada!
            </h4>
            <p className="text-sm text-emerald-200 font-semibold">
              Ganho do motorista:{' '}
              <strong className="text-emerald-400 text-lg">{formatBRL(split.driverEarnings)}</strong>{' '}
              ({isPromoZeroFee ? '100% Motorista / 0% Race até 17/12' : '85% Motorista / 15% Race'})
            </p>
          </div>
          <button
            type="button"
            onClick={handleSimulateIncomingCall}
            className="px-6 py-3 rounded-2xl bg-emerald-600 hover:bg-emerald-500 text-white font-heading font-black text-sm cursor-pointer inline-flex items-center gap-2 shadow-md"
          >
            <RefreshCw className="w-4 h-4" />
            <span>Simular nova chamada de corrida</span>
          </button>
        </div>
      )}

      {/* TELA INICIAL (ANTES DE SIMULAR) */}
      {phase === 'idle' && (
        <div className="bg-white border border-slate-200 rounded-3xl p-5 sm:p-6 shadow-md flex flex-col sm:flex-row items-center justify-between gap-4">
          <div className="flex items-center gap-3.5 text-left">
            <div className="w-12 h-12 rounded-2xl bg-emerald-100 text-emerald-700 border border-emerald-300 flex items-center justify-center shrink-0">
              <Car className="w-6 h-6" />
            </div>
            <div>
              <h4 className="font-heading font-black text-slate-950 text-base">
                Pronto para testar a chamada de corrida
              </h4>
              <p className="text-xs sm:text-sm text-slate-600 font-medium">
                Toque em <strong>Simular chamada de corrida</strong> para tocar o som e ver foto do passageiro, origem, destino, valor (100% até 17/12), Aceitar/Recusar, código de 4 dígitos e Finalizar.
              </p>
            </div>
          </div>
          <button
            type="button"
            onClick={handleSimulateIncomingCall}
            className="w-full sm:w-auto px-5 py-3 rounded-2xl bg-emerald-600 hover:bg-emerald-500 active:scale-95 text-white font-heading font-black text-sm cursor-pointer shadow-md flex items-center justify-center gap-2 shrink-0"
          >
            <BellRing className="w-4 h-4 shrink-0" />
            <span>Simular chamada</span>
          </button>
        </div>
      )}

      {/* MAPA DE INDAIATUBA EM TEMPO REAL */}
      <div className="bg-white border border-slate-200 rounded-3xl overflow-hidden shadow-md">
        <div className="px-4 py-2.5 bg-slate-950 text-white flex items-center justify-between text-xs font-mono">
          <span className="font-bold flex items-center gap-2">
            <span className="w-2.5 h-2.5 rounded-full bg-emerald-400 animate-pulse" />
            Mapa de Indaiatuba — Visão do Motorista
          </span>
          <span className="text-emerald-400 font-bold">
            {phase === 'idle'
              ? 'Aguardando chamada'
              : phase === 'ringing'
              ? 'Chamada tocando'
              : phase === 'accepted'
              ? 'Indo até embarque'
              : phase === 'in_progress'
              ? 'Em rota para destino'
              : 'Concluída'}
          </span>
        </div>
        <div className="h-[300px] sm:h-[340px] w-full relative">
          <MapRealtime
            drivers={[]}
            pickup={simulatedCall?.pickup || null}
            destination={simulatedCall?.destination || null}
            activeDriver={null}
            rideStatus={mapRideStatus}
          />
        </div>
      </div>
    </div>
  );
};
