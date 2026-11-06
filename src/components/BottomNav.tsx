import React from 'react';
import { 
  Car, 
  Package, 
  ShieldCheck, 
  History, 
  UserCheck 
} from 'lucide-react';

import { AppUser } from '../types';

export type TabType = 'rides' | 'delivery' | 'driver_portal' | 'history' | 'admin';

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
  // 1. Esconder botão ADM da BottomNav para motorista, motoboy e passageiro.
  // Só mostrar se currentUser.email === 'admin@race.com.br'
  const isAdmin = currentUser?.email?.trim().toLowerCase() === 'admin@race.com.br';

  const tabs = [
    {
      id: 'rides' as TabType,
      label: 'Corridas',
      sublabel: 'Carro / Moto',
      icon: Car,
      badge: 'R$2,50/km',
    },
    {
      id: 'delivery' as TabType,
      label: 'Entregas',
      sublabel: 'Flash Motoboy',
      icon: Package,
      badge: 'R$2,00/km',
    },
    {
      id: 'driver_portal' as TabType,
      label: 'Condutor',
      sublabel: 'R$200 Semanal',
      icon: UserCheck,
      isHighlight: true,
      onlineDot: isDriverOnline,
    },
    {
      id: 'history' as TabType,
      label: 'Histórico',
      sublabel: 'Recibos & Km',
      icon: History,
    },
    ...(isAdmin
      ? [
          {
            id: 'admin' as TabType,
            label: 'Painel Admin',
            sublabel: 'Métricas & Dados',
            icon: ShieldCheck,
          },
        ]
      : []),
  ];

  return (
    <nav className="fixed bottom-0 left-0 right-0 z-50 bg-white/95 backdrop-blur-lg border-t border-slate-200 px-3 py-2 shadow-[0_-8px_20px_rgba(0,0,0,0.06)]">
      <div className="max-w-2xl mx-auto flex items-center justify-around gap-1.5">
        {tabs.map((tab) => {
          const Icon = tab.icon;
          const isActive = activeTab === tab.id;

          return (
            <button
              key={tab.id}
              onClick={() => onChangeTab(tab.id)}
              className={`relative flex flex-col items-center justify-center flex-1 py-2 px-1.5 rounded-xl transition-all duration-200 cursor-pointer ${
                isActive
                  ? 'text-amber-700 bg-amber-50 font-black border border-amber-300 shadow-sm scale-105'
                  : 'text-slate-600 hover:text-slate-900 hover:bg-slate-100'
              }`}
            >
              {/* Highlight badge for Category Price / R$300 */}
              {tab.badge && (
                <span className="hidden xs:block absolute -top-2.5 text-[10px] font-mono font-extrabold bg-white border border-slate-300 text-amber-700 px-1.5 py-0.2 rounded-full shadow-sm">
                  {tab.badge}
                </span>
              )}

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
