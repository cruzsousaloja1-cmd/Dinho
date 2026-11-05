import React, { useState } from 'react';
import { Driver, AppUser } from '../types';
import { Eye, EyeOff, AlertTriangle, UserPlus, Car } from 'lucide-react';
import confetti from 'canvas-confetti';
import { PassengerRegisterView } from './PassengerRegisterView';
import { DriverRegisterView } from './DriverRegisterView';

interface DriverLoginScreenProps {
  drivers: Driver[];
  passengers?: AppUser[];
  onLoginSuccess: (user: AppUser, driver?: Driver) => void;
  onRegisterDriverSuccess: (user: AppUser, newDriver: Driver) => void;
  onRegisterPassengerSuccess: (user: AppUser) => void;
}

export const DriverLoginScreen: React.FC<DriverLoginScreenProps> = ({
  drivers,
  passengers = [],
  onLoginSuccess,
  onRegisterDriverSuccess,
  onRegisterPassengerSuccess,
}) => {
  const [viewMode, setViewMode] = useState<'login' | 'register_driver' | 'register_passenger'>('login');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);

  const handleLoginSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    setErrorMessage(null);

    const cleanEmail = email.trim().toLowerCase();
    if (!cleanEmail || !password) {
      setErrorMessage('Por favor, informe seu e-mail e sua senha.');
      return;
    }

    // 4. No login, detectar automaticamente se é motorista ou passageiro pelo cadastro e direcionar
    // Primeiro verifica se é MOTORISTA
    const matchedDriver = drivers.find((d) => d.email.toLowerCase() === cleanEmail);
    if (matchedDriver) {
      if (matchedDriver.password && matchedDriver.password !== password) {
        setErrorMessage('Senha incorreta para esta conta de motorista.');
        return;
      }

      const now = new Date();
      const expiresDate = matchedDriver.weeklyFeeExpiresAt
        ? new Date(matchedDriver.weeklyFeeExpiresAt)
        : matchedDriver.weeklyPlanExpiresAt
        ? new Date(matchedDriver.weeklyPlanExpiresAt)
        : null;
      const isSubActive = Boolean(matchedDriver.weeklyPlanActive && expiresDate && expiresDate > now);

      const targetDriver: Driver = {
        ...matchedDriver,
        status: isSubActive ? 'online' : 'offline',
      };

      const appUser: AppUser = {
        id: targetDriver.id,
        name: targetDriver.name,
        email: targetDriver.email,
        phone: targetDriver.phone,
        role: 'driver',
        avatar: targetDriver.avatar,
        rating: targetDriver.rating,
        driverData: targetDriver,
      };

      try {
        confetti({ particleCount: 50, spread: 60, origin: { y: 0.6 } });
      } catch {}

      onLoginSuccess(appUser, targetDriver);
      return;
    }

    // Em seguida verifica se é PASSAGEIRO
    // Busca em passengers do prop ou no localStorage
    let allPassengers = [...passengers];
    try {
      const stored = localStorage.getItem('race_registered_passengers');
      if (stored) {
        const parsed = JSON.parse(stored);
        if (Array.isArray(parsed)) {
          allPassengers = [...allPassengers, ...parsed];
        }
      }
    } catch {}

    const matchedPassenger = allPassengers.find((p) => p.email.toLowerCase() === cleanEmail);
    if (matchedPassenger) {
      if (matchedPassenger.password && matchedPassenger.password !== password) {
        setErrorMessage('Senha incorreta para esta conta de passageiro.');
        return;
      }

      try {
        confetti({ particleCount: 50, spread: 60, origin: { y: 0.6 } });
      } catch {}

      onLoginSuccess(matchedPassenger);
      return;
    }

    // Não encontrado em nenhuma das bases
    setErrorMessage(
      'Nenhuma conta encontrada com este e-mail. Crie sua conta de motorista ou de passageiro abaixo.'
    );
  };

  // Se estiver em modo Cadastro de Passageiro
  if (viewMode === 'register_passenger') {
    return (
      <PassengerRegisterView
        existingPassengers={passengers}
        onRegisterSuccess={(newUser) => {
          onRegisterPassengerSuccess(newUser);
        }}
        onBackToLogin={() => {
          setErrorMessage(null);
          setViewMode('login');
        }}
      />
    );
  }

  // Se estiver em modo Cadastro de Motorista
  if (viewMode === 'register_driver') {
    return (
      <DriverRegisterView
        existingDrivers={drivers}
        onRegisterSuccess={(user, newDriver) => {
          onRegisterDriverSuccess(user, newDriver);
        }}
        onBackToLogin={() => {
          setErrorMessage(null);
          setViewMode('login');
        }}
      />
    );
  }

  return (
    <div className="min-h-screen bg-[#000000] text-white flex flex-col justify-center items-center px-6 py-12 selection:bg-[#ff6a00] selection:text-white">
      <div className="w-full max-w-sm sm:max-w-md space-y-8 animate-fade-in">
        {/* Topo: Título RACE em laranja #ff6a00, bem grande, bold, centralizado */}
        <div className="text-center space-y-2">
          <h1 className="text-6xl sm:text-7xl font-heading font-black text-[#ff6a00] tracking-tighter uppercase select-none">
            RACE
          </h1>
          <p className="text-zinc-300 font-medium text-base sm:text-lg tracking-wide">
            App do Motorista & Passageiro
          </p>
        </div>

        {/* Mensagem de Erro se houver */}
        {errorMessage && (
          <div className="bg-red-950/80 border border-red-500/80 text-red-200 text-xs sm:text-sm p-3.5 rounded-xl flex items-center gap-2 font-medium">
            <AlertTriangle className="w-4 h-4 text-red-400 shrink-0" />
            <span>{errorMessage}</span>
          </div>
        )}

        {/* Formulário de Login */}
        <form onSubmit={handleLoginSubmit} className="space-y-6 pt-2">
          {/* Campo EMAIL */}
          <div className="space-y-2">
            <label className="text-white text-xs font-bold uppercase tracking-wider block">
              EMAIL
            </label>
            <input
              type="email"
              required
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              placeholder="seu.email@exemplo.com"
              className="w-full bg-[#1a1a1a] border border-[#2a2a2a] text-white placeholder-zinc-500 rounded-xl px-4 py-3.5 text-base focus:outline-none focus:border-[#ff6a00] transition-colors"
            />
          </div>

          {/* Campo SENHA */}
          <div className="space-y-2">
            <label className="text-white text-xs font-bold uppercase tracking-wider block">
              SENHA
            </label>
            <div className="relative">
              <input
                type={showPassword ? 'text' : 'password'}
                required
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                placeholder="••••••••"
                className="w-full bg-[#1a1a1a] border border-[#2a2a2a] text-white placeholder-zinc-500 rounded-xl px-4 py-3.5 text-base focus:outline-none focus:border-[#ff6a00] transition-colors pr-12"
              />
              <button
                type="button"
                onClick={() => setShowPassword(!showPassword)}
                className="absolute right-4 top-4 text-zinc-400 hover:text-white transition-colors cursor-pointer"
                title={showPassword ? 'Ocultar senha' : 'Ver senha'}
              >
                {showPassword ? <EyeOff className="w-5 h-5" /> : <Eye className="w-5 h-5" />}
              </button>
            </div>
          </div>

          {/* Botão ENTRAR laranja #ff6a00, texto branco bold, borda arredondada, largura total */}
          <button
            type="submit"
            className="w-full bg-[#ff6a00] hover:bg-[#e05e00] active:scale-[0.99] text-white font-heading font-black text-lg py-4 px-6 rounded-xl transition-all cursor-pointer shadow-lg shadow-[#ff6a00]/20 uppercase tracking-wider block mt-8"
          >
            ENTRAR
          </button>

          {/* 1. Embaixo do botão ENTRAR, 2 botões: Criar conta de motorista e Criar conta de passageiro */}
          <div className="space-y-3 pt-2">
            {/* Botão 1: "Criar conta de motorista" laranja */}
            <button
              type="button"
              onClick={() => {
                setErrorMessage(null);
                setViewMode('register_driver');
              }}
              className="w-full py-3 px-4 rounded-xl text-center text-[#ff6a00] hover:bg-[#ff6a00]/10 border border-[#ff6a00]/40 text-sm font-bold transition-all cursor-pointer flex items-center justify-center gap-2"
            >
              <Car className="w-4 h-4" />
              <span>Criar conta de motorista</span>
            </button>

            {/* Botão 2: "Criar conta de passageiro" branco / outline */}
            <button
              type="button"
              onClick={() => {
                setErrorMessage(null);
                setViewMode('register_passenger');
              }}
              className="w-full py-3 px-4 rounded-xl text-center text-white hover:bg-white/10 border border-zinc-600 hover:border-zinc-400 text-sm font-bold transition-all cursor-pointer flex items-center justify-center gap-2 shadow-sm"
            >
              <UserPlus className="w-4 h-4 text-zinc-300" />
              <span>Criar conta de passageiro</span>
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};
