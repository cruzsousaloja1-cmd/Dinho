import React, { useState } from 'react';
import { Driver, AppUser } from '../types';
import { Eye, EyeOff, AlertTriangle, UserPlus, Car, Bike } from 'lucide-react';
import confetti from 'canvas-confetti';
import { PassengerRegisterView } from './PassengerRegisterView';
import { DriverRegisterView } from './DriverRegisterView';
import { MotoboyRegisterView } from './MotoboyRegisterView';

interface DriverLoginScreenProps {
  drivers: Driver[];
  passengers?: AppUser[];
  onLoginSuccess: (user: AppUser, driver?: Driver) => void;
  onRegisterDriverSuccess: (user: AppUser, newDriver: Driver) => void;
  onRegisterMotoboySuccess?: (user: AppUser, newMotoboy: Driver) => void;
  onRegisterPassengerSuccess: (user: AppUser) => void;
}

export const DriverLoginScreen: React.FC<DriverLoginScreenProps> = ({
  drivers,
  passengers = [],
  onLoginSuccess,
  onRegisterDriverSuccess,
  onRegisterMotoboySuccess,
  onRegisterPassengerSuccess,
}) => {
  const [viewMode, setViewMode] = useState<
    'login' | 'register_driver' | 'register_motoboy' | 'register_passenger'
  >('login');
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

    // 1. Carrega todas as bases persistidas no localStorage
    let allDrivers = [...drivers];
    try {
      const stored = localStorage.getItem('race_registered_drivers');
      if (stored) {
        const parsed = JSON.parse(stored);
        if (Array.isArray(parsed)) {
          allDrivers = [...parsed, ...allDrivers.filter((d) => !parsed.some((p: any) => p.id === d.id))];
        }
      }
    } catch {}

    let allPassengers = [...passengers];
    try {
      const stored = localStorage.getItem('race_registered_passengers');
      if (stored) {
        const parsed = JSON.parse(stored);
        if (Array.isArray(parsed)) {
          allPassengers = [...parsed, ...allPassengers.filter((p) => !parsed.some((x: any) => x.id === p.id))];
        }
      }
    } catch {}

    // 2. Verifica se é MOTORISTA ou MOTOBOY
    const matchedDriver = allDrivers.find((d) => d.email.toLowerCase() === cleanEmail);
    if (matchedDriver) {
      if (matchedDriver.password && matchedDriver.password !== password) {
        setErrorMessage('Senha incorreta para esta conta de parceiro.');
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

      const isMoto = targetDriver.category === 'moto_entrega' || targetDriver.category === 'moto_passageiro';
      const userTipo = isMoto ? 'motoboy' : 'driver';

      const appUser: AppUser = {
        id: targetDriver.id,
        name: targetDriver.name,
        email: targetDriver.email,
        phone: targetDriver.phone,
        role: isMoto ? 'motoboy' : 'driver',
        tipo: userTipo,
        avatar: targetDriver.avatar,
        rating: targetDriver.rating,
        driverData: targetDriver,
      };

      // Salva login persistente no localStorage
      try {
        localStorage.setItem(
          'race_current_user',
          JSON.stringify({
            id: appUser.id,
            name: appUser.name,
            email: appUser.email,
            phone: appUser.phone,
            tipo: userTipo,
            role: appUser.role,
            avatar: appUser.avatar,
            driverData: targetDriver,
          })
        );
      } catch {}

      try {
        confetti({ particleCount: 50, spread: 60, origin: { y: 0.6 } });
      } catch {}

      onLoginSuccess(appUser, targetDriver);
      return;
    }

    // 3. Em seguida verifica se é PASSAGEIRO
    const matchedPassenger = allPassengers.find((p) => p.email.toLowerCase() === cleanEmail);
    if (matchedPassenger) {
      if (matchedPassenger.password && matchedPassenger.password !== password) {
        setErrorMessage('Senha incorreta para esta conta de passageiro.');
        return;
      }

      const appUser: AppUser = {
        ...matchedPassenger,
        tipo: 'passenger',
        role: 'passenger',
      };

      // Salva login persistente no localStorage
      try {
        localStorage.setItem(
          'race_current_user',
          JSON.stringify({
            id: appUser.id,
            name: appUser.name,
            email: appUser.email,
            phone: appUser.phone,
            tipo: 'passenger',
            role: 'passenger',
            avatar: appUser.avatar,
          })
        );
      } catch {}

      try {
        confetti({ particleCount: 50, spread: 60, origin: { y: 0.6 } });
      } catch {}

      onLoginSuccess(appUser);
      return;
    }

    // 4. Se não achou nas listas separadas, busca em race_users genérico
    try {
      const storedUsers = localStorage.getItem('race_users');
      if (storedUsers) {
        const usersList: any[] = JSON.parse(storedUsers);
        const genericMatch = usersList.find((u) => u.email?.toLowerCase() === cleanEmail);
        if (genericMatch) {
          if (genericMatch.password && genericMatch.password !== password) {
            setErrorMessage('Senha incorreta.');
            return;
          }
          const appUser: AppUser = {
            id: genericMatch.id,
            name: genericMatch.name,
            email: genericMatch.email,
            phone: genericMatch.phone,
            role: genericMatch.role || (genericMatch.tipo === 'motoboy' ? 'motoboy' : genericMatch.tipo === 'driver' ? 'driver' : 'passenger'),
            tipo: genericMatch.tipo || 'passenger',
          };
          localStorage.setItem('race_current_user', JSON.stringify(appUser));
          onLoginSuccess(appUser);
          return;
        }
      }
    } catch {}

    // Não encontrado em nenhuma das bases
    setErrorMessage(
      'Nenhuma conta encontrada com este e-mail. Crie sua conta de motorista, motoboy ou passageiro abaixo.'
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

  // Se estiver em modo Cadastro de Motorista (Carro)
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

  // Se estiver em modo Cadastro de Motoboy
  if (viewMode === 'register_motoboy') {
    return (
      <MotoboyRegisterView
        existingDrivers={drivers}
        onRegisterSuccess={(user, newMotoboy) => {
          if (onRegisterMotoboySuccess) {
            onRegisterMotoboySuccess(user, newMotoboy);
          } else {
            onRegisterDriverSuccess(user, newMotoboy);
          }
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
      <div className="w-full max-w-sm sm:max-w-md space-y-7 animate-fade-in">
        {/* Topo: Título RACE em laranja #ff6a00, bem grande, bold, centralizado */}
        <div className="text-center space-y-2">
          <h1 className="text-6xl sm:text-7xl font-heading font-black text-[#ff6a00] tracking-tighter uppercase select-none">
            RACE
          </h1>
          <p className="text-zinc-300 font-medium text-base sm:text-lg tracking-wide">
            App do Motorista, Motoboy & Passageiro
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
        <form onSubmit={handleLoginSubmit} className="space-y-5 pt-1">
          {/* Campo EMAIL */}
          <div className="space-y-1.5">
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
          <div className="space-y-1.5">
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
            className="w-full bg-[#ff6a00] hover:bg-[#e05e00] active:scale-[0.99] text-white font-heading font-black text-lg py-4 px-6 rounded-xl transition-all cursor-pointer shadow-lg shadow-[#ff6a00]/20 uppercase tracking-wider block mt-6"
          >
            ENTRAR
          </button>

          {/* Opções de Cadastro: Motorista, Motoboy, Passageiro */}
          <div className="space-y-2.5 pt-2">
            <div className="text-center">
              <span className="text-xs text-zinc-400 uppercase tracking-wider font-semibold">
                Ou crie sua conta gratuita:
              </span>
            </div>

            {/* Botão 1: "Criar conta de motorista" (Carro) laranja */}
            <button
              type="button"
              onClick={() => {
                setErrorMessage(null);
                setViewMode('register_driver');
              }}
              className="w-full py-3 px-4 rounded-xl text-center text-[#ff6a00] hover:bg-[#ff6a00]/10 border border-[#ff6a00]/40 text-sm font-bold transition-all cursor-pointer flex items-center justify-center gap-2"
            >
              <Car className="w-4 h-4" />
              <span>Criar conta de motorista (Carro)</span>
            </button>

            {/* Botão 2: "Criar conta de motoboy" (Moto / Entregas) */}
            <button
              type="button"
              onClick={() => {
                setErrorMessage(null);
                setViewMode('register_motoboy');
              }}
              className="w-full py-3 px-4 rounded-xl text-center text-amber-400 hover:bg-amber-400/10 border border-amber-400/40 text-sm font-bold transition-all cursor-pointer flex items-center justify-center gap-2"
            >
              <Bike className="w-4 h-4" />
              <span>Criar conta de motoboy (Flash & Entregas)</span>
            </button>

            {/* Botão 3: "Criar conta de passageiro" branco / outline */}
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
