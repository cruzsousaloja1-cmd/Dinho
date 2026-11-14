import React, { useState } from 'react';
import { 
  Bell, 
  Headphones, 
  ShieldAlert,
  Share2,
  LogIn,
  User,
  LogOut,
  MoreVertical,
  X,
  ChevronRight,
  ShieldCheck
} from 'lucide-react';
import { AppUser } from '../types';
import { WEEKLY_FEE_BADGE } from '../config/pricing';

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
  const [isMobileMenuOpen, setIsMobileMenuOpen] = useState(false);

  const isAdmin = currentUser?.email?.trim().toLowerCase() === 'admin@race.com.br';

  const isUserDriver = Boolean(
    currentUser && (
      currentUser.role === 'driver' ||
      currentUser.role === 'motoboy' ||
      Boolean(currentUser.driverData) ||
      currentUser.tipo === 'motorista_economico' ||
      currentUser.tipo === 'motorista_confort' ||
      currentUser.tipo === 'motoboy_passageiro' ||
      currentUser.tipo === 'motoboy_entregas'
    )
  );

  const handleMobileNav = (action: () => void) => {
    action();
    setIsMobileMenuOpen(false);
  };

  return (
    <header className="sticky top-0 z-50 bg-white/95 backdrop-blur-md border-b border-slate-200 shadow-xs w-full max-w-full overflow-x-hidden">
      {/* Main Bar */}
      <div className="max-w-7xl mx-auto px-4 sm:px-6 py-2.5 sm:py-3.5 flex items-center justify-between gap-2 w-full max-w-[100vw] box-border">
        {/* Brand RACE em Destaque */}
        <div className="flex items-center gap-2 sm:gap-3 shrink-0 min-w-0">
          <div 
            className="flex items-center gap-2 sm:gap-2.5 group cursor-pointer" 
            onClick={() => onChangeRole('passenger')}
          >
            <div className="relative flex items-center justify-center w-9 h-9 sm:w-12 sm:h-12 rounded-2xl bg-slate-950 text-white font-black shadow-md border border-slate-800 shrink-0">
              <span className="font-heading text-lg sm:text-2xl tracking-tighter italic font-black">R</span>
              <div className="absolute -top-1 -right-1 w-3 h-3 rounded-full bg-emerald-500 border-2 border-white shadow"></div>
            </div>
            <div className="min-w-0">
              <div className="flex items-center gap-1.5 sm:gap-2">
                <span className="font-heading font-black text-xl sm:text-3xl md:text-4xl tracking-wider text-slate-950 italic leading-none">
                  RACE
                </span>
                <span className="text-[10px] sm:text-xs font-extrabold tracking-widest px-1.5 py-0.5 rounded bg-slate-900 text-white uppercase border border-slate-800 font-mono">
                  PRO
                </span>
              </div>
              <p className="text-[11px] text-slate-500 font-semibold hidden md:block tracking-wide mt-0.5">
                Mobilidade Urbana & Entregas Inteligentes
              </p>
            </div>
          </div>
        </div>

        {/* Quick Role Switcher in Header (Desktop md+) */}
        {isUserDriver && (
          <div className="hidden lg:flex items-center bg-slate-100 p-1.5 rounded-2xl border border-slate-200 text-sm font-bold shadow-inner">
            <button
              onClick={() => onChangeRole('passenger')}
              className={`px-4 py-2 rounded-xl transition-all cursor-pointer ${
                activeRole === 'passenger'
                  ? 'bg-slate-950 text-white font-extrabold shadow'
                  : 'text-slate-600 hover:text-slate-900 hover:bg-white/80'
              }`}
            >
              Sou passageiro
            </button>
            <button
              onClick={() => onChangeRole('driver')}
              className={`px-4 py-2 rounded-xl transition-all flex items-center gap-2 cursor-pointer ${
                activeRole === 'driver'
                  ? 'bg-[#ff6a00] text-white font-extrabold shadow'
                  : 'text-slate-600 hover:text-slate-900 hover:bg-white/80'
              }`}
            >
              <span>Sou motorista</span>
              <span className={`text-xs px-2 py-0.5 rounded-md font-mono font-bold ${
                activeRole === 'driver'
                  ? 'bg-white text-slate-950'
                  : 'bg-emerald-100 text-emerald-800'
              }`}>
                {WEEKLY_FEE_BADGE}
              </span>
            </button>
            {isAdmin && (
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
            )}
          </div>
        )}

        {/* Action Buttons Desktop (md+) */}
        <div className="hidden md:flex items-center gap-2 sm:gap-2.5">
          {/* User Account / Login & Cadastrar */}
          {currentUser ? (
            <div className="flex items-center gap-1.5 bg-slate-100 border border-slate-300 rounded-xl px-2.5 py-1.5 shadow-xs">
              {currentUser.avatar ? (
                <img
                  src={currentUser.avatar}
                  alt={currentUser.name}
                  className="w-7 h-7 rounded-full object-cover border border-amber-500 shadow-2xs"
                />
              ) : (
                <div className="w-6 h-6 rounded-full bg-slate-900 text-white font-bold text-xs flex items-center justify-center">
                  {currentUser.name.charAt(0).toUpperCase()}
                </div>
              )}
              <div className="text-left hidden lg:block">
                <span className="text-xs font-black text-slate-950 block leading-tight truncate max-w-[100px]">
                  {currentUser.name.split(' ')[0]}
                </span>
                <span className="text-[10px] font-bold text-emerald-700 block leading-none">
                  {currentUser.role === 'driver'
                    ? 'Motorista'
                    : currentUser.role === 'motoboy'
                    ? 'Motoboy'
                    : 'Passageiro'}
                </span>
              </div>
              {onLogout && (
                <button
                  type="button"
                  onClick={onLogout}
                  className="flex items-center gap-1 text-slate-500 hover:text-rose-600 px-2 py-1 rounded-lg hover:bg-rose-50 cursor-pointer transition-colors text-xs font-bold"
                  title="Sair / Deslogar"
                >
                  <LogOut className="w-3.5 h-3.5" />
                  <span className="hidden sm:inline">Sair</span>
                </button>
              )}
            </div>
          ) : (
            onOpenAuthModal && (
              <button
                type="button"
                onClick={onOpenAuthModal}
                className="flex items-center gap-1.5 px-3 py-2 rounded-xl bg-amber-500 hover:bg-amber-400 text-slate-950 text-xs sm:text-sm font-heading font-black transition-all shadow-xs cursor-pointer active:scale-95 border border-amber-400"
                title="Entrar com Login e Senha ou Cadastrar"
              >
                <LogIn className="w-4 h-4" />
                <span>Entrar / Cadastrar</span>
              </button>
            )
          )}

          {/* Compartilhar App */}
          <button
            onClick={onOpenShare}
            className="flex items-center gap-1.5 px-3 py-2 rounded-xl bg-emerald-50 hover:bg-emerald-100 border border-emerald-300 text-emerald-800 text-xs sm:text-sm font-bold transition-all shadow-xs cursor-pointer active:scale-95"
            title="Compartilhar Aplicativo RACE"
          >
            <Share2 className="w-4 h-4 text-emerald-700" />
            <span>Compartilhar</span>
          </button>

          {/* Suporte 24 Horas */}
          <button
            onClick={onOpenSupport}
            className="flex items-center gap-1.5 px-3 py-2 rounded-xl bg-slate-100 hover:bg-slate-200 border border-slate-300 text-slate-900 text-xs sm:text-sm font-bold transition-all shadow-xs cursor-pointer group active:scale-95"
            title="Suporte Técnico 24 Horas RACE"
          >
            <Headphones className="w-4 h-4 text-slate-800 group-hover:rotate-12 transition-transform" />
            <span>Suporte 24h</span>
            <span className="w-2 h-2 rounded-full bg-emerald-500 radar-pulse"></span>
          </button>

          {/* SOS Emergência */}
          <button
            onClick={onOpenSos}
            className="flex items-center gap-1.5 px-3 py-2 rounded-xl bg-rose-50 hover:bg-rose-100 border border-rose-300 text-rose-700 text-xs sm:text-sm font-black transition-all shadow-xs cursor-pointer active:scale-95"
            title="Botão do Pânico / Segurança 24h"
          >
            <ShieldAlert className="w-4 h-4 text-rose-600 animate-pulse" />
            <span>SOS</span>
          </button>

          {/* Notificações */}
          <button
            onClick={onOpenNotifications}
            className="relative w-10 h-10 rounded-xl bg-slate-100 hover:bg-slate-200 border border-slate-300 flex items-center justify-center text-slate-800 transition-all cursor-pointer active:scale-95 shadow-xs"
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

        {/* Action Cluster Mobile (abaixo de 768px - SEMPRE CABE EM 360px) */}
        <div className="flex md:hidden items-center gap-1.5 shrink-0">
          {/* Botão SOS Rápido */}
          <button
            type="button"
            onClick={onOpenSos}
            className="flex items-center gap-1 px-2.5 py-1.5 rounded-xl bg-rose-50 hover:bg-rose-100 border border-rose-300 text-rose-700 text-xs font-black transition-all shadow-xs cursor-pointer active:scale-95"
            title="SOS Emergência"
          >
            <ShieldAlert className="w-3.5 h-3.5 text-rose-600 animate-pulse" />
            <span>SOS</span>
          </button>

          {/* Botão Notificações */}
          <button
            type="button"
            onClick={onOpenNotifications}
            className="relative w-9 h-9 rounded-xl bg-slate-100 hover:bg-slate-200 border border-slate-300 flex items-center justify-center text-slate-800 transition-all cursor-pointer active:scale-95 shadow-xs"
            title="Notificações"
          >
            <Bell className="w-4 h-4" />
            {unreadNotifsCount > 0 && (
              <span className="absolute -top-1 -right-1 w-4 h-4 rounded-full bg-red-600 text-white text-[10px] font-black flex items-center justify-center shadow">
                {unreadNotifsCount}
              </span>
            )}
          </button>

          {/* Botão Menu 3 Pontinhos ⋮ */}
          <button
            type="button"
            onClick={() => setIsMobileMenuOpen(!isMobileMenuOpen)}
            className="w-9 h-9 rounded-xl bg-slate-950 hover:bg-slate-800 text-white flex items-center justify-center transition-all cursor-pointer active:scale-95 shadow-xs border border-slate-800 ml-0.5"
            aria-label="Menu de Opções"
            title="Mais Opções"
          >
            {isMobileMenuOpen ? (
              <X className="w-5 h-5 text-amber-400" />
            ) : (
              <MoreVertical className="w-5 h-5 text-white" />
            )}
          </button>
        </div>
      </div>

      {/* Barra de alternância rápida: Sou passageiro / Sou motorista (Visível para quem é motorista) */}
      {isUserDriver && (
        <div className="bg-slate-950 text-white px-3 sm:px-6 py-2 border-t border-slate-800 flex items-center justify-between gap-2 shadow-inner">
          <div className="flex items-center gap-1.5 text-xs font-medium">
            <span className="text-zinc-400 hidden xs:inline">Modo:</span>
            <span className="text-[#ff6a00] font-heading font-black uppercase text-xs">
              {activeRole === 'passenger' ? 'Passageiro' : 'Motorista'}
            </span>
          </div>
          <div className="flex items-center gap-1.5 shrink-0">
            <button
              type="button"
              onClick={() => onChangeRole('passenger')}
              className={`px-3 py-1.5 rounded-xl text-xs font-heading font-black transition-all cursor-pointer ${
                activeRole === 'passenger'
                  ? 'bg-[#ff6a00] text-white shadow-sm ring-2 ring-[#ff6a00]/30'
                  : 'bg-zinc-800 text-zinc-300 hover:text-white hover:bg-zinc-700'
              }`}
            >
              Sou passageiro
            </button>
            <button
              type="button"
              onClick={() => onChangeRole('driver')}
              className={`px-3 py-1.5 rounded-xl text-xs font-heading font-black transition-all cursor-pointer ${
                activeRole === 'driver'
                  ? 'bg-[#ff6a00] text-white shadow-sm ring-2 ring-[#ff6a00]/30'
                  : 'bg-zinc-800 text-zinc-300 hover:text-white hover:bg-zinc-700'
              }`}
            >
              Sou motorista
            </button>
          </div>
        </div>
      )}

      {/* Menu Lateral / Drawer Móvel Responsivo (Botão 3 Pontinhos) */}
      {isMobileMenuOpen && (
        <div className="md:hidden border-t border-slate-200 bg-white/98 backdrop-blur-xl px-4 py-4 space-y-4 shadow-2xl animate-fade-in max-h-[82vh] overflow-y-auto">
          {/* Usuário / Conta no Menu */}
          {currentUser ? (
            <div className="flex items-center justify-between p-3.5 rounded-2xl bg-slate-50 border border-slate-200">
              <div className="flex items-center gap-3">
                {currentUser.avatar ? (
                  <img
                    src={currentUser.avatar}
                    alt={currentUser.name}
                    className="w-10 h-10 rounded-full object-cover border-2 border-amber-500 shadow-sm"
                  />
                ) : (
                  <div className="w-10 h-10 rounded-full bg-slate-900 text-white font-bold text-sm flex items-center justify-center">
                    {currentUser.name.charAt(0).toUpperCase()}
                  </div>
                )}
                <div>
                  <h4 className="font-heading font-black text-slate-950 text-sm">
                    {currentUser.name}
                  </h4>
                  <span className="text-xs font-bold text-emerald-700">
                    {currentUser.role === 'driver'
                      ? 'Motorista Parceiro'
                      : currentUser.role === 'motoboy'
                      ? 'Motoboy Parceiro'
                      : 'Passageiro RACE'}
                  </span>
                </div>
              </div>

              {onLogout && (
                <button
                  type="button"
                  onClick={() => handleMobileNav(onLogout)}
                  className="px-3 py-1.5 rounded-xl bg-rose-50 text-rose-700 hover:bg-rose-100 border border-rose-200 text-xs font-bold flex items-center gap-1 cursor-pointer"
                >
                  <LogOut className="w-3.5 h-3.5" />
                  <span>Sair</span>
                </button>
              )}
            </div>
          ) : (
            onOpenAuthModal && (
              <button
                type="button"
                onClick={() => handleMobileNav(onOpenAuthModal)}
                className="w-full flex items-center justify-center gap-2 py-3.5 px-4 rounded-2xl bg-amber-500 hover:bg-amber-400 text-slate-950 font-heading font-black text-sm shadow-md cursor-pointer border border-amber-400"
              >
                <LogIn className="w-4 h-4" />
                <span>Entrar ou Criar Nova Conta</span>
              </button>
            )
          )}

          {/* Lista de Ações Móveis */}
          <div className="space-y-2 pt-1">
            <label className="text-[11px] font-heading font-black uppercase text-slate-500 tracking-wider">
              Serviços & Suporte
            </label>

            {/* Suporte 24h */}
            <button
              type="button"
              onClick={() => handleMobileNav(onOpenSupport)}
              className="w-full flex items-center justify-between p-3.5 rounded-2xl bg-slate-50 hover:bg-slate-100 border border-slate-200 text-slate-900 transition-all cursor-pointer"
            >
              <div className="flex items-center gap-3">
                <div className="w-9 h-9 rounded-xl bg-slate-200 text-slate-800 flex items-center justify-center">
                  <Headphones className="w-5 h-5" />
                </div>
                <div className="text-left">
                  <span className="font-heading font-black text-sm block">Suporte 24 Horas</span>
                  <span className="text-xs text-emerald-700 font-bold flex items-center gap-1">
                    <span className="w-2 h-2 rounded-full bg-emerald-500 radar-pulse" />
                    Atendimento Online
                  </span>
                </div>
              </div>
              <ChevronRight className="w-4 h-4 text-slate-400" />
            </button>

            {/* Compartilhar App */}
            <button
              type="button"
              onClick={() => handleMobileNav(onOpenShare)}
              className="w-full flex items-center justify-between p-3.5 rounded-2xl bg-emerald-50 hover:bg-emerald-100/80 border border-emerald-200 text-emerald-950 transition-all cursor-pointer"
            >
              <div className="flex items-center gap-3">
                <div className="w-9 h-9 rounded-xl bg-emerald-200 text-emerald-800 flex items-center justify-center">
                  <Share2 className="w-5 h-5" />
                </div>
                <div className="text-left">
                  <span className="font-heading font-black text-sm block">Compartilhar App RACE</span>
                  <span className="text-xs text-emerald-800">Indique amigos ou passageiros</span>
                </div>
              </div>
              <ChevronRight className="w-4 h-4 text-emerald-600" />
            </button>

            {/* Painel Administrativo - Apenas para Administrador */}
            {isAdmin && (
              <button
                type="button"
                onClick={() => handleMobileNav(() => onChangeRole('admin'))}
                className={`w-full flex items-center justify-between p-3.5 rounded-2xl transition-all cursor-pointer ${
                  activeRole === 'admin'
                    ? 'bg-slate-950 text-white shadow-xs'
                    : 'bg-slate-50 hover:bg-slate-100 border border-slate-200 text-slate-900'
                }`}
              >
                <div className="flex items-center gap-3">
                  <div className={`w-9 h-9 rounded-xl flex items-center justify-center ${
                    activeRole === 'admin' ? 'bg-amber-500 text-slate-950' : 'bg-slate-200 text-slate-800'
                  }`}>
                    <ShieldCheck className="w-5 h-5" />
                  </div>
                  <div className="text-left">
                    <span className="font-heading font-black text-sm block">Painel Administrativo</span>
                    <span className={`text-xs ${activeRole === 'admin' ? 'text-zinc-300' : 'text-slate-500'}`}>
                      Métricas, Motoristas & Aprovação PIX
                    </span>
                  </div>
                </div>
                <ChevronRight className="w-4 h-4 text-slate-400" />
              </button>
            )}

            {/* Botão Sair / Deslogar no Menu Lateral (Requisito 3) */}
            {currentUser && onLogout && (
              <button
                type="button"
                onClick={() => handleMobileNav(onLogout)}
                className="w-full flex items-center justify-between p-3.5 rounded-2xl bg-rose-50 hover:bg-rose-100 border border-rose-200 text-rose-700 transition-all cursor-pointer"
              >
                <div className="flex items-center gap-3">
                  <div className="w-9 h-9 rounded-xl bg-rose-200 text-rose-800 flex items-center justify-center">
                    <LogOut className="w-5 h-5" />
                  </div>
                  <div className="text-left">
                    <span className="font-heading font-black text-sm block text-rose-800">
                      Sair da Conta / Deslogar
                    </span>
                    <span className="text-xs text-rose-600">
                      Limpar acesso e voltar para tela de login
                    </span>
                  </div>
                </div>
                <ChevronRight className="w-4 h-4 text-rose-400" />
              </button>
            )}
          </div>

          {/* Rodapé do Menu */}
          <div className="pt-2 text-center border-t border-slate-100 text-xs text-slate-500 font-medium">
            RACE PRO &bull; Mobilidade Urbana com 100% Repasse Livre
          </div>
        </div>
      )}
    </header>
  );
};
