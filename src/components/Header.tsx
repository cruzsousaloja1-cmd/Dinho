import React from 'react';
import { 
  Bell, 
  Headphones, 
  ShieldAlert,
  Share2,
  LogIn,
  User,
  LogOut,
  Download
} from 'lucide-react';
import { AppUser } from '../types';

interface HeaderProps {
  unreadNotifsCount: number;
  onOpenNotifications: () => void;
  onOpenSupport: () => void;
  onOpenSos: () => void;
  onOpenShare: () => void;
  activeRole: 'passenger' | 'driver' | 'admin';
  onChangeRole: (role: 'passenger' | 'driver' | 'admin') => void;
  currentUser?: AppUser | null;
  onOpenAuthModal?: () => void;
  onLogout?: () => void;
}

export const Header: React.FC<HeaderProps> = ({
  unreadNotifsCount,
  onOpenNotifications,
  onOpenSupport,
  onOpenSos,
  onOpenShare,
  activeRole,
  onChangeRole,
  currentUser,
  onOpenAuthModal,
  onLogout,
}) => {
  return (
    <header className="sticky top-0 z-50 bg-white border-b border-slate-200 shadow-xs">
      {/* Main Bar - Clean White Theme without top orange banner */}
      <div className="max-w-7xl mx-auto px-4 sm:px-6 py-3.5 flex items-center justify-between gap-3">
        {/* Brand RACE em Destaque */}
        <div className="flex items-center gap-3">
          <div 
            className="flex items-center gap-2.5 group cursor-pointer" 
            onClick={() => onChangeRole('passenger')}
          >
            <div className="relative flex items-center justify-center w-12 h-12 rounded-2xl bg-slate-950 text-white font-black shadow-md border border-slate-800">
              <span className="font-heading text-2xl sm:text-3xl tracking-tighter italic font-black">R</span>
              <div className="absolute -top-1 -right-1 w-3.5 h-3.5 rounded-full bg-emerald-500 border-2 border-white shadow"></div>
            </div>
            <div>
              <div className="flex items-center gap-2">
                <span className="font-heading font-black text-3xl sm:text-4xl tracking-wider text-slate-950 italic">
                  RACE
                </span>
                <span className="text-xs font-extrabold tracking-widest px-2 py-0.5 rounded-md bg-slate-900 text-white uppercase border border-slate-800 font-mono">
                  PRO
                </span>
              </div>
              <p className="text-xs text-slate-500 font-semibold hidden sm:block tracking-wide">
                Mobilidade Urbana & Entregas Inteligentes
              </p>
            </div>
          </div>
        </div>

        {/* Quick Role Switcher in Header */}
        <div className="hidden lg:flex items-center bg-slate-100 p-1.5 rounded-2xl border border-slate-200 text-sm font-bold shadow-inner">
          <button
            onClick={() => onChangeRole('passenger')}
            className={`px-4 py-2 rounded-xl transition-all cursor-pointer ${
              activeRole === 'passenger'
                ? 'bg-slate-950 text-white font-extrabold shadow'
                : 'text-slate-600 hover:text-slate-900 hover:bg-white/80'
            }`}
          >
            Passageiro
          </button>
          <button
            onClick={() => onChangeRole('driver')}
            className={`px-4 py-2 rounded-xl transition-all flex items-center gap-2 cursor-pointer ${
              activeRole === 'driver'
                ? 'bg-slate-950 text-white font-extrabold shadow'
                : 'text-slate-600 hover:text-slate-900 hover:bg-white/80'
            }`}
          >
            <span>Motorista / Motoboy</span>
            <span className={`text-xs px-2 py-0.5 rounded-md font-mono font-bold ${
              activeRole === 'driver'
                ? 'bg-emerald-500 text-slate-950'
                : 'bg-emerald-100 text-emerald-800'
            }`}>
              R$300/sem
            </span>
          </button>
          <button
            onClick={() => onChangeRole('admin')}
            className={`px-4 py-2 rounded-xl transition-all cursor-pointer ${
              activeRole === 'admin'
                ? 'bg-slate-950 text-white font-extrabold shadow'
                : 'text-slate-600 hover:text-slate-900 hover:bg-white/80'
            }`}
          >
            Painel Admin
          </button>
        </div>

        {/* Action Buttons: Login/Cadastrar, Compartilhar, 24h Support, SOS, Notifications */}
        <div className="flex items-center gap-2 sm:gap-2.5">
          {/* User Account / Login & Cadastrar */}
          {currentUser ? (
            <div className="flex items-center gap-1.5 bg-slate-100 border border-slate-300 rounded-xl px-2.5 py-1.5 shadow-xs">
              <div className="w-6 h-6 rounded-full bg-slate-900 text-white font-bold text-xs flex items-center justify-center">
                {currentUser.name.charAt(0).toUpperCase()}
              </div>
              <div className="text-left hidden md:block">
                <span className="text-xs font-black text-slate-950 block leading-tight truncate max-w-[100px]">
                  {currentUser.name.split(' ')[0]}
                </span>
                <span className="text-[10px] font-bold text-emerald-700 block leading-none">
                  {currentUser.role === 'driver' ? 'Motorista' : 'Passageiro'}
                </span>
              </div>
              {onLogout && (
                <button
                  type="button"
                  onClick={onLogout}
                  className="text-slate-400 hover:text-rose-600 p-1 cursor-pointer transition-colors"
                  title="Sair / Trocar de Conta"
                >
                  <LogOut className="w-3.5 h-3.5" />
                </button>
              )}
            </div>
          ) : (
            onOpenAuthModal && (
              <button
                type="button"
                onClick={onOpenAuthModal}
                className="flex items-center gap-1.5 px-3 py-2 sm:py-2.5 rounded-xl bg-amber-500 hover:bg-amber-400 text-slate-950 text-xs sm:text-sm font-heading font-black transition-all shadow-xs cursor-pointer active:scale-95 border border-amber-400"
                title="Entrar com Login e Senha ou Cadastrar"
              >
                <LogIn className="w-4 h-4" />
                <span>Entrar / Cadastrar</span>
              </button>
            )
          )}

          {/* Baixar Código .ZIP */}
          <a
            href="/race-app-codigo-fonte.zip"
            download="race-app-codigo-fonte.zip"
            className="flex items-center gap-1.5 px-3 py-2 sm:py-2.5 rounded-xl bg-slate-900 hover:bg-slate-800 border border-slate-900 text-white text-xs sm:text-sm font-black transition-all shadow-xs cursor-pointer active:scale-95"
            title="Baixar Código-Fonte Completo (.ZIP)"
          >
            <Download className="w-4 h-4 text-emerald-400" />
            <span className="hidden sm:inline">Baixar .ZIP</span>
          </a>

          {/* Compartilhar App */}
          <button
            onClick={onOpenShare}
            className="flex items-center gap-1.5 px-3 py-2 sm:py-2.5 rounded-xl bg-emerald-50 hover:bg-emerald-100 border border-emerald-300 text-emerald-800 text-xs sm:text-sm font-bold transition-all shadow-xs cursor-pointer active:scale-95"
            title="Compartilhar Aplicativo RACE"
          >
            <Share2 className="w-4 h-4 text-emerald-700" />
            <span className="hidden sm:inline">Compartilhar</span>
          </button>

          {/* Suporte 24 Horas */}
          <button
            onClick={onOpenSupport}
            className="flex items-center gap-2 px-3 py-2 sm:py-2.5 rounded-xl bg-slate-100 hover:bg-slate-200 border border-slate-300 text-slate-900 text-xs sm:text-sm font-bold transition-all shadow-xs cursor-pointer group active:scale-95"
            title="Suporte Técnico 24 Horas RACE"
          >
            <Headphones className="w-4 h-4 text-slate-800 group-hover:rotate-12 transition-transform" />
            <span className="hidden md:inline">Suporte 24h</span>
            <span className="w-2.5 h-2.5 rounded-full bg-emerald-500 radar-pulse md:ml-0.5"></span>
          </button>

          {/* SOS Emergência */}
          <button
            onClick={onOpenSos}
            className="flex items-center gap-1.5 px-3 py-2 sm:py-2.5 rounded-xl bg-rose-50 hover:bg-rose-100 border border-rose-300 text-rose-700 text-xs sm:text-sm font-black transition-all shadow-xs cursor-pointer active:scale-95"
            title="Botão do Pânico / Segurança 24h"
          >
            <ShieldAlert className="w-4 h-4 text-rose-600 animate-pulse" />
            <span>SOS</span>
          </button>

          {/* Notificações */}
          <button
            onClick={onOpenNotifications}
            className="relative w-10 h-10 sm:w-11 sm:h-11 rounded-xl bg-slate-100 hover:bg-slate-200 border border-slate-300 flex items-center justify-center text-slate-800 transition-all cursor-pointer active:scale-95 shadow-xs"
            title="Notificações push"
          >
            <Bell className="w-5 h-5" />
            {unreadNotifsCount > 0 && (
              <span className="absolute -top-1 -right-1 w-5 h-5 rounded-full bg-red-600 text-white text-xs font-black flex items-center justify-center shadow">
                {unreadNotifsCount}
              </span>
            )}
          </button>
        </div>
      </div>
    </header>
  );
};
