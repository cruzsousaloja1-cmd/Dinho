import React, { useState } from 'react';
import { Driver, AppUser } from '../types';
import { Eye, EyeOff, AlertTriangle, UserPlus, Car, Bike, Package, ArrowRight, Sparkles } from 'lucide-react';
import confetti from 'canvas-confetti';
import { PassengerRegisterView } from './PassengerRegisterView';
import { DriverRegisterView } from './DriverRegisterView';
import { MotoboyRegisterView } from './MotoboyRegisterView';
import { CategoryRegisterView, CategoryRegisterKey } from './CategoryRegisterView';

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
    'login' | 'register_category' | 'register_driver' | 'register_motoboy' | 'register_passenger'
  >('login');
  const [selectedCategoryKey, setSelectedCategoryKey] = useState<CategoryRegisterKey>('motorista_economico');
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

    // 0. Acesso Secreto para Administrador: admin@race.com.br com senha race123
    if (cleanEmail === 'admin@race.com.br') {
      if (password !== 'race123' && password !== 'race@2024' && password !== 'admin' && password !== 'admin123') {
        setErrorMessage('Senha incorreta para a conta de Administrador (use race123).');
        return;
      }

      const adminUser: AppUser = {
        id: 'usr-admin-master',
        name: 'Administrador Geral',
        email: 'admin@race.com.br',
        phone: '(11) 99999-0000',
        role: 'admin',
        isAdmin: true,
        rating: 5.0,
      };

      try {
        localStorage.setItem(
          'race_current_user',
          JSON.stringify({
            id: adminUser.id,
            name: adminUser.name,
            email: adminUser.email,
            phone: adminUser.phone,
            role: 'admin',
            isAdmin: true,
          })
        );
      } catch {}

      try {
        confetti({ particleCount: 60, spread: 70, origin: { y: 0.6 } });
      } catch {}

      onLoginSuccess(adminUser);
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

  // Se estiver em modo Cadastro por Categoria Específica (Econômico, Confort, Motoboy Passageiro, Motoboy Entregas)
  if (viewMode === 'register_category' && selectedCategoryKey) {
    return (
      <CategoryRegisterView
        categoryKey={selectedCategoryKey}
        existingDrivers={drivers}
        onRegisterSuccess={(user, newDriver) => {
          onRegisterDriverSuccess(user, newDriver);
        }}
        onBackToOptions={() => {
          setErrorMessage(null);
          setViewMode('login');
        }}
      />
    );
  }

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

          {/* CADASTRO POR CATEGORIA NO RACE: 4 CARDS GRANDES CLICÁVEIS */}
          <div className="space-y-3 pt-3 border-t border-zinc-800/80">
            <div className="text-center space-y-0.5">
              <span className="text-xs text-[#ff6a00] font-heading font-black uppercase tracking-wider block">
                CADASTRO POR CATEGORIA NO RACE
              </span>
              <p className="text-[11px] text-zinc-400">
                Toque na categoria para abrir o cadastro direto:
              </p>
            </div>

            <div className="grid grid-cols-1 gap-2.5">
              {/* 1. Motorista Econômico */}
              <button
                type="button"
                onClick={() => {
                  setErrorMessage(null);
                  setSelectedCategoryKey('motorista_economico');
                  setViewMode('register_category');
                }}
                className="w-full p-3.5 bg-[#121212] hover:bg-[#1a1a1a] active:scale-[0.99] border-2 border-zinc-800 hover:border-zinc-600 rounded-2xl transition-all cursor-pointer text-left flex items-center justify-between group shadow-sm"
              >
                <div className="flex items-center gap-3">
                  <div className="w-11 h-11 rounded-xl bg-zinc-900 border border-zinc-700 flex items-center justify-center shrink-0 group-hover:scale-105 transition-transform">
                    <Car className="w-6 h-6 text-zinc-400" />
                  </div>
                  <div className="overflow-hidden">
                    <div className="flex items-center gap-2">
                      <span className="font-heading font-black text-white text-sm sm:text-base">
                        Motorista Econômico
                      </span>
                      <span className="bg-zinc-800 text-zinc-300 text-[10px] px-2 py-0.5 rounded-full font-mono font-bold">
                        R$ 2,50/km
                      </span>
                    </div>
                    <p className="text-xs text-zinc-400 font-medium truncate mt-0.5">
                      Carro comum - ganhe com corridas baratas em Indaiatuba
                    </p>
                  </div>
                </div>
                <ArrowRight className="w-4 h-4 text-zinc-500 group-hover:text-white shrink-0 ml-2" />
              </button>

              {/* 2. Motorista Confort */}
              <button
                type="button"
                onClick={() => {
                  setErrorMessage(null);
                  setSelectedCategoryKey('motorista_confort');
                  setViewMode('register_category');
                }}
                className="w-full p-3.5 bg-[#141210] hover:bg-[#1f1a14] active:scale-[0.99] border-2 border-[#ff6a00]/40 hover:border-[#ff6a00] rounded-2xl transition-all cursor-pointer text-left flex items-center justify-between group shadow-sm"
              >
                <div className="flex items-center gap-3">
                  <div className="w-11 h-11 rounded-xl bg-[#ff6a00]/15 border border-[#ff6a00]/40 flex items-center justify-center shrink-0 group-hover:scale-105 transition-transform">
                    <Car className="w-6 h-6 text-[#ff6a00]" />
                  </div>
                  <div className="overflow-hidden">
                    <div className="flex items-center gap-2">
                      <span className="font-heading font-black text-white text-sm sm:text-base">
                        Motorista Confort
                      </span>
                      <span className="bg-[#ff6a00] text-black text-[10px] px-2 py-0.5 rounded-full font-mono font-black">
                        Carro 2020+
                      </span>
                    </div>
                    <p className="text-xs text-zinc-400 font-medium truncate mt-0.5">
                      Carro novo - corridas com mais conforto e preço maior
                    </p>
                  </div>
                </div>
                <ArrowRight className="w-4 h-4 text-[#ff6a00] shrink-0 ml-2" />
              </button>

              {/* 3. Motoboy Passageiro */}
              <button
                type="button"
                onClick={() => {
                  setErrorMessage(null);
                  setSelectedCategoryKey('motoboy_passageiro');
                  setViewMode('register_category');
                }}
                className="w-full p-3.5 bg-[#0e161a] hover:bg-[#121f26] active:scale-[0.99] border-2 border-cyan-800/40 hover:border-cyan-500 rounded-2xl transition-all cursor-pointer text-left flex items-center justify-between group shadow-sm"
              >
                <div className="flex items-center gap-3">
                  <div className="w-11 h-11 rounded-xl bg-cyan-950/40 border border-cyan-700/50 flex items-center justify-center shrink-0 group-hover:scale-105 transition-transform">
                    <Bike className="w-6 h-6 text-cyan-400" />
                  </div>
                  <div className="overflow-hidden">
                    <div className="flex items-center gap-2">
                      <span className="font-heading font-black text-white text-sm sm:text-base">
                        Motoboy Passageiro
                      </span>
                      <span className="bg-cyan-900/60 text-cyan-300 text-[10px] px-2 py-0.5 rounded-full font-mono font-bold">
                        R$ 1,80/km
                      </span>
                    </div>
                    <p className="text-xs text-zinc-400 font-medium truncate mt-0.5">
                      Moto para levar passageiro rápido
                    </p>
                  </div>
                </div>
                <ArrowRight className="w-4 h-4 text-cyan-400 shrink-0 ml-2" />
              </button>

              {/* 4. Motoboy Entregas */}
              <button
                type="button"
                onClick={() => {
                  setErrorMessage(null);
                  setSelectedCategoryKey('motoboy_entregas');
                  setViewMode('register_category');
                }}
                className="w-full p-3.5 bg-[#18140c] hover:bg-[#241c0e] active:scale-[0.99] border-2 border-amber-800/40 hover:border-amber-500 rounded-2xl transition-all cursor-pointer text-left flex items-center justify-between group shadow-sm"
              >
                <div className="flex items-center gap-3">
                  <div className="w-11 h-11 rounded-xl bg-amber-950/40 border border-amber-700/50 flex items-center justify-center shrink-0 group-hover:scale-105 transition-transform">
                    <Package className="w-6 h-6 text-amber-400" />
                  </div>
                  <div className="overflow-hidden">
                    <div className="flex items-center gap-2">
                      <span className="font-heading font-black text-white text-sm sm:text-base">
                        Motoboy Entregas
                      </span>
                      <span className="bg-amber-900/60 text-amber-300 text-[10px] px-2 py-0.5 rounded-full font-mono font-bold">
                        R$ 2,00/km
                      </span>
                    </div>
                    <p className="text-xs text-zinc-400 font-medium truncate mt-0.5">
                      Moto para entregar encomendas em Indaiatuba
                    </p>
                  </div>
                </div>
                <ArrowRight className="w-4 h-4 text-amber-400 shrink-0 ml-2" />
              </button>
            </div>

            {/* Botão Sou Passageiro */}
            <div className="pt-2 text-center">
              <button
                type="button"
                onClick={() => {
                  setErrorMessage(null);
                  setViewMode('register_passenger');
                }}
                className="w-full py-3 px-4 rounded-xl text-center text-white hover:bg-white/10 border border-zinc-700 hover:border-zinc-500 text-sm font-bold transition-all cursor-pointer flex items-center justify-center gap-2 shadow-sm"
              >
                <UserPlus className="w-4 h-4 text-zinc-300" />
                <span>Sou passageiro - Criar conta de passageiro</span>
              </button>
            </div>
          </div>
        </form>
      </div>
    </div>
  );
};
