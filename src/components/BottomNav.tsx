import React from 'react';
import { 
  Car, 
  MoreHorizontal, 
  Clock, 
  User, 
  ShieldCheck, 
  History, 
  UserCheck 
} from 'lucide-react';

import { AppUser } from '../types';

export type TabType = 
  | 'rides' 
  | 'delivery' 
  | 'driver_portal' 
  | 'history' 
  | 'admin'
  | 'passenger_options'
  | 'passenger_account';

interface BottomNavProps {
  activeTab: TabType;
  onChangeTab: (tab: TabType) => void;
  isDriverOnline?: boolean;
  currentUser?: AppUser | null;
}

export const BottomNav: React.FC<BottomNavProps> = ({
  activeTab,
  onChangeTab,
  isDriverOnline,
  currentUser,
}) => {
  // Identifica se é Motorista/Motoboy ou Administrador
  const isDriverOrMotoboy = Boolean(
    currentUser?.role === 'driver' ||
    currentUser?.role === 'motoboy' ||
    currentUser?.driverData
  );
  const isAdmin = currentUser?.email?.trim().toLowerCase() === 'admin@race.com.br';
  const isPassenger = !isDriverOrMotoboy && !isAdmin;

  // 1. BARRA EXCLUSIVA DO PASSAGEIRO: SÓ 4 BOTÕES (CORRIDA, OPÇÃO, ATIVIDADE, CONTA)
  // Sem botão Motorista, sem ADM, sem Entregas, sem valor por km ou ganhos
  if (isPassenger) {
    const passengerTabs = [
      {
        id: 'rides' as TabType,
        label: 'CORRIDA',
        icon: Car,
      },
      {
        id: 'passenger_options' as TabType,
        label: 'OPÇÃO',
        icon: MoreHorizontal,
      },
      {
        id: 'history' as TabType,
        label: 'ATIVIDADE',
        icon: Clock,
      },
      {
        id: 'passenger_account' as TabType,
        label: 'CONTA',
        icon: User,
      },
    ];

    return (
      <nav className="fixed bottom-0 left-0 right-0 z-50 bg-white/95 backdrop-blur-lg border-t border-slate-200 px-3 py-2 shadow-[0_-8px_20px_rgba(0,0,0,0.06)]">
        <div className="max-w-md mx-auto flex items-center justify-around gap-2">
          {passengerTabs.map((tab) => {
            const Icon = tab.icon;
            const isActive = activeTab === tab.id;

            return (
              <button
                key={tab.id}
                type="button"
                onClick={() => onChangeTab(tab.id)}
                className={`relative flex flex-col items-center justify-center flex-1 py-2 px-1 rounded-2xl transition-all duration-200 cursor-pointer ${
                  isActive
                    ? 'text-[#ff6a00] bg-orange-50 font-black border border-[#ff6a00]/30 shadow-xs scale-105'
                    : 'text-slate-600 hover:text-slate-900 hover:bg-slate-100'
                }`}
              >
                <div
                  className={`p-1 rounded-xl transition-transform ${
                    isActive ? 'text-[#ff6a00]' : 'text-slate-600'
                  }`}
                >
                  <Icon className="w-6 h-6 stroke-[2.5]" />
                </div>

                <span className="text-[11px] sm:text-xs font-heading font-black mt-0.5 tracking-wider uppercase">
                  {tab.label}
                </span>
              </button>
            );
          })}
        </div>
      </nav>
    );
  }

  // 2. BARRA DO MOTORISTA / MOTOBOY / ADMIN (Mantém barra com Motorista, Ganhos, etc.)
  const driverTabs = [
    {
      id: 'rides' as TabType,
      label: 'Corridas',
      sublabel: 'Atendimento',
      icon: Car,
    },
    {
      id: 'driver_portal' as TabType,
      label: 'Motorista',
      sublabel: '85% seu • 15% Race',
      icon: UserCheck,
      isHighlight: true,
      onlineDot: isDriverOnline,
    },
    {
      id: 'history' as TabType,
      label: 'Histórico',
      sublabel: 'Ganhos & Corridas',
      icon: History,
    },
    ...(isAdmin
      ? [
          {
            id: 'admin' as TabType,
            label: 'Painel Admin',
            sublabel: 'Gestão Geral',
            icon: ShieldCheck,
          },
        ]
      : []),
  ];

  return (
    <nav className="fixed bottom-0 left-0 right-0 z-50 bg-white/95 backdrop-blur-lg border-t border-slate-200 px-3 py-2 shadow-[0_-8px_20px_rgba(0,0,0,0.06)]">
      <div className="max-w-2xl mx-auto flex items-center justify-around gap-1.5">
        {driverTabs.map((tab) => {
          const Icon = tab.icon;
          const isActive = activeTab === tab.id;

          return (
            <button
              key={tab.id}
              type="button"
              onClick={() => onChangeTab(tab.id)}
              className={`relative flex flex-col items-center justify-center flex-1 py-2 px-1.5 rounded-xl transition-all duration-200 cursor-pointer ${
                isActive
                  ? 'text-amber-700 bg-amber-50 font-black border border-amber-300 shadow-sm scale-105'
                  : 'text-slate-600 hover:text-slate-900 hover:bg-slate-100'
              }`}
            >
              {/* Online Indicator if driver is active */}
              {tab.onlineDot !== undefined && (
                <span
                  className={`absolute top-1.5 right-2 w-2.5 h-2.5 rounded-full ${
                    tab.onlineDot ? 'bg-emerald-500 radar-pulse' : 'bg-slate-400'
                  }`}
                />
              )}

              <div
                className={`relative p-1 rounded-lg ${
                  tab.isHighlight && isActive
                    ? 'bg-amber-500 text-slate-950 shadow-md'
                    : isActive
                    ? 'text-amber-600'
                    : 'text-slate-600'
                }`}
              >
                <Icon className="w-6 h-6 transition-transform" />
              </div>

              <span className="text-xs sm:text-sm font-heading font-bold mt-0.5 whitespace-nowrap leading-tight">
                {tab.label}
              </span>
              <span className="text-[10px] sm:text-xs text-slate-500 font-medium leading-none hidden sm:inline">
                {tab.sublabel}
              </span>
            </button>
          );
        })}
      </div>
    </nav>
  );
};
