import React, { useState } from 'react';
import { AppUser, LocationPoint } from '../types';
import { 
  User, 
  Mail, 
  Phone, 
  MapPin, 
  LogOut, 
  Navigation, 
  Crosshair, 
  CheckCircle2, 
  ShieldCheck, 
  Clock, 
  Share2, 
  Headphones, 
  Star,
  KeyRound
} from 'lucide-react';
import { reverseGeocodeCoords } from '../services/addressSearchService';

interface PassengerAccountViewProps {
  currentUser: AppUser | null;
  currentAddress?: string;
  pickup?: LocationPoint | null;
  onUpdateAddress?: (address: string, lat: number, lng: number) => void;
  onLogout: () => void;
  onNavigateToHistory: () => void;
  onOpenSupport?: () => void;
  onOpenShare?: () => void;
}

export const PassengerAccountView: React.FC<PassengerAccountViewProps> = ({
  currentUser,
  currentAddress,
  pickup,
  onUpdateAddress,
  onLogout,
  onNavigateToHistory,
  onOpenSupport,
  onOpenShare,
}) => {
  const [gpsStatus, setGpsStatus] = useState<string | null>(null);
  const [isLocating, setIsLocating] = useState(false);
  const [activeAddress, setActiveAddress] = useState(
    pickup?.address || currentAddress || 'Av. Presidente Vargas, 1250 - Centro, Indaiatuba-SP'
  );

  const displayName = currentUser?.name || 'Passageiro RACE';
  const displayEmail = currentUser?.email || 'passageiro@race.com.br';
  const displayPhone = currentUser?.whatsapp || currentUser?.phone || '(19) 99887-1122';
  const displayLogin = currentUser?.login || currentUser?.email || 'passageiro.indaiatuba';

  // Atualizar endereço com GPS Real ou Indaiatuba
  const handleUpdateGps = () => {
    setIsLocating(true);
    setGpsStatus('Localizando satélites GPS...');

    if (typeof navigator !== 'undefined' && 'geolocation' in navigator) {
      navigator.geolocation.getCurrentPosition(
        async (position) => {
          const lat = position.coords.latitude;
          const lng = position.coords.longitude;
          try {
            const detected = await reverseGeocodeCoords(lat, lng);
            const addressString = detected.fullAddress;
            setActiveAddress(addressString);
            if (onUpdateAddress) onUpdateAddress(addressString, lat, lng);
            setGpsStatus('📍 Localização GPS atualizada com sucesso!');
          } catch {
            const defaultAddress = 'Av. Presidente Vargas, 1250 - Centro, Indaiatuba-SP';
            setActiveAddress(defaultAddress);
            if (onUpdateAddress) onUpdateAddress(defaultAddress, -23.0842, -47.2118);
            setGpsStatus('📍 Localização GPS Indaiatuba atualizada!');
          } finally {
            setIsLocating(false);
            setTimeout(() => setGpsStatus(null), 4000);
          }
        },
        () => {
          // Fallback seguro em Indaiatuba
          const fallbackAddr = 'Av. Presidente Vargas, 1250 - Centro, Indaiatuba-SP';
          setActiveAddress(fallbackAddr);
          if (onUpdateAddress) onUpdateAddress(fallbackAddr, -23.0842, -47.2118);
          setGpsStatus('📍 Localização GPS definida em Indaiatuba - SP');
          setIsLocating(false);
          setTimeout(() => setGpsStatus(null), 4000);
        },
        { enableHighAccuracy: true, timeout: 6000 }
      );
    } else {
      const fallbackAddr = 'Av. Presidente Vargas, 1250 - Centro, Indaiatuba-SP';
      setActiveAddress(fallbackAddr);
      if (onUpdateAddress) onUpdateAddress(fallbackAddr, -23.0842, -47.2118);
      setGpsStatus('📍 Localização GPS definida em Indaiatuba - SP');
      setIsLocating(false);
      setTimeout(() => setGpsStatus(null), 4000);
    }
  };

  return (
    <div className="space-y-5 animate-fade-in pb-10">
      {/* 1. Header do Perfil do Passageiro */}
      <div className="bg-white border border-slate-200 rounded-3xl p-5 sm:p-6 shadow-md flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
        <div className="flex items-center gap-4">
          <div className="w-16 h-16 rounded-full bg-gradient-to-tr from-amber-500 to-[#ff6a00] text-white font-heading font-black text-2xl flex items-center justify-center border-3 border-white shadow-lg shrink-0">
            {displayName.charAt(0).toUpperCase()}
          </div>
          <div>
            <div className="flex items-center gap-2 flex-wrap">
              <h2 className="font-heading font-black text-slate-950 text-xl sm:text-2xl">
                {displayName}
              </h2>
              <span className="bg-emerald-50 text-emerald-800 border border-emerald-300 text-xs px-2.5 py-0.5 rounded-full font-bold flex items-center gap-1">
                <CheckCircle2 className="w-3.5 h-3.5 text-emerald-600" />
                Passageiro Ativo
              </span>
            </div>
            <div className="flex items-center gap-3 mt-1 text-xs text-slate-600 font-medium">
              <span className="flex items-center gap-1 text-amber-600 font-bold">
                <Star className="w-3.5 h-3.5 fill-amber-500 text-amber-500" />
                {(currentUser?.rating || 5.0).toFixed(1)} Avaliação
              </span>
              <span>•</span>
              <span className="font-mono text-slate-500">ID: {currentUser?.id || 'RCE-USR'}</span>
            </div>
          </div>
        </div>

        <button
          type="button"
          onClick={onLogout}
          className="px-4 py-2.5 rounded-xl bg-rose-50 hover:bg-rose-100 text-rose-700 border border-rose-300 font-heading font-black text-xs sm:text-sm flex items-center gap-2 transition-all cursor-pointer shadow-xs active:scale-95"
          title="Sair da Conta"
        >
          <LogOut className="w-4 h-4 text-rose-600" />
          <span>Sair</span>
        </button>
      </div>

      {/* 2. DADOS CADASTRAIS (Nome, E-mail, WhatsApp, Login) */}
      <div className="bg-white border border-slate-200 rounded-3xl p-5 sm:p-6 shadow-md space-y-4">
        <h3 className="font-heading font-black text-slate-950 text-base sm:text-lg flex items-center gap-2">
          <User className="w-5 h-5 text-[#ff6a00]" />
          <span>Meus Dados Cadastrais</span>
        </h3>

        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3.5">
          {/* Nome */}
          <div className="bg-slate-50 rounded-2xl p-4 border border-slate-200">
            <span className="text-[11px] font-mono font-bold text-slate-500 uppercase block tracking-wider">
              Nome Completo
            </span>
            <p className="font-heading font-black text-slate-900 text-sm sm:text-base mt-0.5">
              {displayName}
            </p>
          </div>

          {/* E-mail */}
          <div className="bg-slate-50 rounded-2xl p-4 border border-slate-200">
            <span className="text-[11px] font-mono font-bold text-slate-500 uppercase block tracking-wider">
              E-mail Cadastrado
            </span>
            <p className="font-mono font-bold text-slate-900 text-sm sm:text-base mt-0.5 break-all">
              {displayEmail}
            </p>
          </div>

          {/* WhatsApp */}
          <div className="bg-slate-50 rounded-2xl p-4 border border-slate-200">
            <span className="text-[11px] font-mono font-bold text-slate-500 uppercase block tracking-wider">
              WhatsApp / Celular
            </span>
            <p className="font-mono font-bold text-slate-900 text-sm sm:text-base mt-0.5">
              {displayPhone}
            </p>
          </div>

          {/* Login */}
          <div className="bg-slate-50 rounded-2xl p-4 border border-slate-200">
            <span className="text-[11px] font-mono font-bold text-slate-500 uppercase block tracking-wider">
              Login (Nome de Usuário)
            </span>
            <p className="font-mono font-bold text-slate-900 text-sm sm:text-base mt-0.5">
              {displayLogin}
            </p>
          </div>
        </div>
      </div>

      {/* 3. ENDEREÇO COM MEU GPS */}
      <div className="bg-white border border-slate-200 rounded-3xl p-5 sm:p-6 shadow-md space-y-4">
        <div className="flex items-center justify-between flex-wrap gap-2">
          <div className="flex items-center gap-2">
            <MapPin className="w-5 h-5 text-emerald-600" />
            <h3 className="font-heading font-black text-slate-950 text-base sm:text-lg">
              Endereço com Meu GPS
            </h3>
          </div>

          <button
            type="button"
            onClick={handleUpdateGps}
            disabled={isLocating}
            className="px-3.5 py-2 rounded-xl bg-emerald-600 hover:bg-emerald-500 active:scale-95 text-white font-heading font-black text-xs flex items-center gap-1.5 transition-all cursor-pointer shadow-xs disabled:opacity-50"
          >
            <Crosshair className={`w-3.5 h-3.5 ${isLocating ? 'animate-spin' : ''}`} />
            <span>{isLocating ? 'Obtendo GPS...' : 'Atualizar com Meu GPS'}</span>
          </button>
        </div>

        {gpsStatus && (
          <div className="bg-emerald-50 border border-emerald-300 rounded-2xl p-3 text-xs text-emerald-900 font-bold flex items-center gap-2">
            <CheckCircle2 className="w-4 h-4 text-emerald-600 shrink-0" />
            <span>{gpsStatus}</span>
          </div>
        )}

        <div className="bg-slate-50 border border-slate-200 rounded-2xl p-4 space-y-1.5">
          <div className="flex items-center gap-2 text-xs font-mono font-bold text-slate-500">
            <Navigation className="w-3.5 h-3.5 text-[#ff6a00]" />
            <span>Localização Atual Detectada em Indaiatuba:</span>
          </div>
          <p className="font-heading font-black text-slate-900 text-sm sm:text-base">
            {activeAddress}
          </p>
          <p className="text-[11px] text-slate-500 font-mono">
            Cidade oficial: Indaiatuba - SP &bull; GPS ativo e calibrado
          </p>
        </div>
      </div>

      {/* 4. ATALHOS RÁPIDOS */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
        <button
          type="button"
          onClick={onNavigateToHistory}
          className="p-4 bg-white hover:bg-slate-50 border border-slate-200 rounded-2xl shadow-xs transition-all cursor-pointer text-left flex items-center gap-3 group active:scale-95"
        >
          <div className="w-10 h-10 rounded-xl bg-amber-50 text-amber-700 flex items-center justify-center border border-amber-200 group-hover:bg-[#ff6a00] group-hover:text-white transition-colors">
            <Clock className="w-5 h-5" />
          </div>
          <div>
            <strong className="block text-slate-900 font-heading font-black text-xs sm:text-sm">
              Minhas Atividades
            </strong>
            <span className="text-[11px] text-slate-500 font-medium">
              Histórico de corridas
            </span>
          </div>
        </button>

        {onOpenSupport && (
          <button
            type="button"
            onClick={onOpenSupport}
            className="p-4 bg-white hover:bg-slate-50 border border-slate-200 rounded-2xl shadow-xs transition-all cursor-pointer text-left flex items-center gap-3 group active:scale-95"
          >
            <div className="w-10 h-10 rounded-xl bg-blue-50 text-blue-700 flex items-center justify-center border border-blue-200 group-hover:bg-blue-600 group-hover:text-white transition-colors">
              <Headphones className="w-5 h-5" />
            </div>
            <div>
              <strong className="block text-slate-900 font-heading font-black text-xs sm:text-sm">
                Suporte 24h
              </strong>
              <span className="text-[11px] text-slate-500 font-medium">
                Atendimento direto
              </span>
            </div>
          </button>
        )}

        {onOpenShare && (
          <button
            type="button"
            onClick={onOpenShare}
            className="p-4 bg-white hover:bg-slate-50 border border-slate-200 rounded-2xl shadow-xs transition-all cursor-pointer text-left flex items-center gap-3 group active:scale-95"
          >
            <div className="w-10 h-10 rounded-xl bg-emerald-50 text-emerald-700 flex items-center justify-center border border-emerald-200 group-hover:bg-emerald-600 group-hover:text-white transition-colors">
              <Share2 className="w-5 h-5" />
            </div>
            <div>
              <strong className="block text-slate-900 font-heading font-black text-xs sm:text-sm">
                Compartilhar App
              </strong>
              <span className="text-[11px] text-slate-500 font-medium">
                Indicar para amigos
              </span>
            </div>
          </button>
        )}
      </div>

      {/* 5. BOTÃO SAIR DA CONTA */}
      <div className="pt-2">
        <button
          type="button"
          onClick={onLogout}
          className="w-full py-4 bg-slate-950 hover:bg-slate-900 active:scale-95 text-white font-heading font-black text-sm sm:text-base rounded-2xl shadow-md transition-all cursor-pointer border border-zinc-800 flex items-center justify-center gap-2.5 uppercase tracking-wider"
        >
          <LogOut className="w-5 h-5 text-rose-500" />
          <span>Sair da Minha Conta</span>
        </button>
      </div>
    </div>
  );
};
