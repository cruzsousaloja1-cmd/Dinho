import React, { useState } from 'react';
import { Driver, AppUser } from '../types';
import { Eye, EyeOff, AlertTriangle, UserPlus, Car, Bike, Package, ArrowRight, ArrowLeft, CheckCircle2, LogIn, Sparkles } from 'lucide-react';
import confetti from 'canvas-confetti';
import { PassengerRegisterView } from './PassengerRegisterView';
import { CategoryRegisterView, CategoryRegisterKey } from './CategoryRegisterView';
import { verifyUserLogin } from '../services/userService';

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
  // viewMode inicia em 'home' (primeira página com somente as duas opções de criação de conta + entrar)
  const [viewMode, setViewMode] = useState<
    'home' | 'select_category' | 'register_category' | 'register_passenger' | 'login_form'
  >('home');
  const [selectedCategoryKey, setSelectedCategoryKey] = useState<CategoryRegisterKey>('motorista_economico');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const [successMessage, setSuccessMessage] = useState<string | null>(null);

  const handleLoginSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    setErrorMessage(null);

    const cleanEmail = email.trim().toLowerCase();
    if (!cleanEmail || !password) {
      setErrorMessage('Por favor, informe seu e-mail e sua senha.');
      return;
    }

    // Valida credenciais e carrega dados isolados daquele usuário
    const result = verifyUserLogin(cleanEmail, password);
    if (!result.success || !result.user) {
      setErrorMessage(result.error || 'E-mail ou senha incorretos.');
      return;
    }

    try {
      confetti({ particleCount: 50, spread: 60, origin: { y: 0.6 } });
    } catch {}

    onLoginSuccess(result.user, result.driver);
  };

  // Se estiver em modo Formulário de Cadastro por Categoria Específica
  if (viewMode === 'register_category' && selectedCategoryKey) {
    return (
      <CategoryRegisterView
        categoryKey={selectedCategoryKey}
        existingDrivers={drivers}
        onRegisterSuccess={(user, newDriver) => {
          onRegisterDriverSuccess(user, newDriver);
          // Após cadastro: NÃO loga direto. Redireciona para entrar com login e senha!
          setEmail(user.email);
          setPassword('');
          setErrorMessage(null);
          setSuccessMessage(`Cadastro de condutor (${user.name}) realizado com sucesso! Agora digite sua senha para entrar.`);
          setViewMode('login_form');
        }}
        onBackToOptions={() => {
          setErrorMessage(null);
          setSuccessMessage(null);
          setViewMode('select_category');
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
          // Após cadastro: NÃO loga direto. Redireciona para entrar com login e senha!
          setEmail(newUser.email);
          setPassword('');
          setErrorMessage(null);
          setSuccessMessage(`Cadastro de passageiro (${newUser.name}) realizado com sucesso! Agora digite sua senha para entrar.`);
          setViewMode('login_form');
        }}
        onBackToLogin={() => {
          setErrorMessage(null);
          setSuccessMessage(null);
          setViewMode('home');
        }}
      />
    );
  }

  // Se estiver na seleção de Categoria de Condutor (Motorista / Motoboy)
  if (viewMode === 'select_category') {
    return (
      <div className="min-h-screen bg-[#000000] text-white flex flex-col justify-center items-center px-6 py-12 selection:bg-[#ff6a00] selection:text-white">
        <div className="w-full max-w-sm sm:max-w-md space-y-6 animate-fade-in">
          {/* Topo com botão voltar para home */}
          <div className="flex items-center justify-between border-b border-zinc-800 pb-3">
            <button
              type="button"
              onClick={() => {
                setErrorMessage(null);
                setSuccessMessage(null);
                setViewMode('home');
              }}
              className="text-zinc-400 hover:text-white text-xs font-bold transition-all cursor-pointer flex items-center gap-1.5"
            >
              <ArrowLeft className="w-4 h-4" />
              <span>Voltar ao início</span>
            </button>
            <span className="text-[11px] font-mono font-bold text-[#ff6a00] uppercase">
              Escolha sua Categoria
            </span>
          </div>

          <div className="text-center space-y-1">
            <h2 className="text-2xl sm:text-3xl font-heading font-black text-white tracking-tight">
              CRIAR CONTA CONDUTOR
            </h2>
            <p className="text-xs sm:text-sm text-zinc-400">
              Selecione sua modalidade para abrir o cadastro:
            </p>
          </div>

          <div className="grid grid-cols-1 gap-3">
            {/* 1. Motorista Econômico */}
            <button
              type="button"
              onClick={() => {
                setErrorMessage(null);
                setSelectedCategoryKey('motorista_economico');
                setViewMode('register_category');
              }}
              className="w-full p-4 bg-[#121212] hover:bg-[#1a1a1a] active:scale-[0.99] border-2 border-zinc-800 hover:border-zinc-500 rounded-2xl transition-all cursor-pointer text-left flex items-center justify-between group shadow-sm"
            >
              <div className="flex items-center gap-3.5">
                <div className="w-12 h-12 rounded-xl bg-zinc-900 border border-zinc-700 flex items-center justify-center shrink-0 group-hover:scale-105 transition-transform">
                  <Car className="w-6 h-6 text-zinc-400" />
                </div>
                <div>
                  <div className="flex items-center gap-2">
                    <span className="font-heading font-black text-white text-sm sm:text-base">
                      Motorista Econômico
                    </span>
                    <span className="bg-zinc-800 text-zinc-300 text-[10px] px-2 py-0.5 rounded-full font-mono font-bold">
                      R$ 2,50/km
                    </span>
                  </div>
                  <p className="text-xs text-zinc-400 font-medium mt-0.5">
                    Carro comum - ganhe com corridas baratas em Indaiatuba
                  </p>
                </div>
              </div>
              <ArrowRight className="w-5 h-5 text-zinc-500 group-hover:text-white shrink-0 ml-2" />
            </button>

            {/* 2. Motorista Confort */}
            <button
              type="button"
              onClick={() => {
                setErrorMessage(null);
                setSelectedCategoryKey('motorista_confort');
                setViewMode('register_category');
              }}
              className="w-full p-4 bg-[#141210] hover:bg-[#1f1a14] active:scale-[0.99] border-2 border-[#ff6a00]/40 hover:border-[#ff6a00] rounded-2xl transition-all cursor-pointer text-left flex items-center justify-between group shadow-sm"
            >
              <div className="flex items-center gap-3.5">
                <div className="w-12 h-12 rounded-xl bg-[#ff6a00]/15 border border-[#ff6a00]/40 flex items-center justify-center shrink-0 group-hover:scale-105 transition-transform">
                  <Car className="w-6 h-6 text-[#ff6a00]" />
                </div>
                <div>
                  <div className="flex items-center gap-2">
                    <span className="font-heading font-black text-white text-sm sm:text-base">
                      Motorista Confort
                    </span>
                    <span className="bg-[#ff6a00] text-black text-[10px] px-2 py-0.5 rounded-full font-mono font-black">
                      Carro 2020+
                    </span>
                  </div>
                  <p className="text-xs text-zinc-400 font-medium mt-0.5">
                    Carro novo - corridas com mais conforto e preço maior
                  </p>
                </div>
              </div>
              <ArrowRight className="w-5 h-5 text-[#ff6a00] shrink-0 ml-2" />
            </button>

            {/* 3. Motoboy Passageiro */}
            <button
              type="button"
              onClick={() => {
                setErrorMessage(null);
                setSelectedCategoryKey('motoboy_passageiro');
                setViewMode('register_category');
              }}
              className="w-full p-4 bg-[#0e161a] hover:bg-[#121f26] active:scale-[0.99] border-2 border-cyan-800/40 hover:border-cyan-500 rounded-2xl transition-all cursor-pointer text-left flex items-center justify-between group shadow-sm"
            >
              <div className="flex items-center gap-3.5">
                <div className="w-12 h-12 rounded-xl bg-cyan-950/40 border border-cyan-700/50 flex items-center justify-center shrink-0 group-hover:scale-105 transition-transform">
                  <Bike className="w-6 h-6 text-cyan-400" />
                </div>
                <div>
                  <div className="flex items-center gap-2">
                    <span className="font-heading font-black text-white text-sm sm:text-base">
                      Motoboy Passageiro
                    </span>
                    <span className="bg-cyan-900/60 text-cyan-300 text-[10px] px-2 py-0.5 rounded-full font-mono font-bold">
                      R$ 1,80/km
                    </span>
                  </div>
                  <p className="text-xs text-zinc-400 font-medium mt-0.5">
                    Moto para levar passageiro rápido
                  </p>
                </div>
              </div>
              <ArrowRight className="w-5 h-5 text-cyan-400 shrink-0 ml-2" />
            </button>

            {/* 4. Motoboy Entregas */}
            <button
              type="button"
              onClick={() => {
                setErrorMessage(null);
                setSelectedCategoryKey('motoboy_entregas');
                setViewMode('register_category');
              }}
              className="w-full p-4 bg-[#18140c] hover:bg-[#241c0e] active:scale-[0.99] border-2 border-amber-800/40 hover:border-amber-500 rounded-2xl transition-all cursor-pointer text-left flex items-center justify-between group shadow-sm"
            >
              <div className="flex items-center gap-3.5">
                <div className="w-12 h-12 rounded-xl bg-amber-950/40 border border-amber-700/50 flex items-center justify-center shrink-0 group-hover:scale-105 transition-transform">
                  <Package className="w-6 h-6 text-amber-400" />
                </div>
                <div>
                  <div className="flex items-center gap-2">
                    <span className="font-heading font-black text-white text-sm sm:text-base">
                      Motoboy Entregas
                    </span>
                    <span className="bg-amber-900/60 text-amber-300 text-[10px] px-2 py-0.5 rounded-full font-mono font-bold">
                      R$ 2,00/km
                    </span>
                  </div>
                  <p className="text-xs text-zinc-400 font-medium mt-0.5">
                    Moto para entregar encomendas em Indaiatuba
                  </p>
                </div>
              </div>
              <ArrowRight className="w-5 h-5 text-amber-400 shrink-0 ml-2" />
            </button>
          </div>
        </div>
      </div>
    );
  }

  // Se estiver na tela de Login com Login e Senha
  if (viewMode === 'login_form') {
    return (
      <div className="min-h-screen bg-[#000000] text-white flex flex-col justify-center items-center px-6 py-12 selection:bg-[#ff6a00] selection:text-white">
        <div className="w-full max-w-sm sm:max-w-md space-y-6 animate-fade-in">
          {/* Topo com botão voltar para home */}
          <div className="flex items-center justify-between border-b border-zinc-800 pb-3">
            <button
              type="button"
              onClick={() => {
                setErrorMessage(null);
                setSuccessMessage(null);
                setViewMode('home');
              }}
              className="text-zinc-400 hover:text-white text-xs font-bold transition-all cursor-pointer flex items-center gap-1.5"
            >
              <ArrowLeft className="w-4 h-4" />
              <span>Voltar ao início</span>
            </button>
            <span className="text-[11px] font-mono font-bold text-[#ff6a00] uppercase">
              Acesso ao Sistema
            </span>
          </div>

          <div className="text-center space-y-1.5">
            <h1 className="text-5xl sm:text-6xl font-heading font-black text-[#ff6a00] tracking-tighter uppercase select-none">
              RACE
            </h1>
            <p className="text-zinc-300 font-medium text-sm sm:text-base tracking-wide">
              Entrar com Login e Senha
            </p>
          </div>

          {/* Mensagem de Sucesso (após cadastro realizado) */}
          {successMessage && (
            <div className="bg-emerald-950/90 border border-emerald-500/90 text-emerald-200 text-xs sm:text-sm p-4 rounded-2xl flex items-start gap-2.5 font-medium shadow-md animate-fade-in">
              <CheckCircle2 className="w-5 h-5 text-emerald-400 shrink-0 mt-0.5" />
              <span>{successMessage}</span>
            </div>
          )}

          {/* Mensagem de Erro se houver */}
          {errorMessage && (
            <div className="bg-red-950/80 border border-red-500/80 text-red-200 text-xs sm:text-sm p-3.5 rounded-xl flex items-center gap-2 font-medium">
              <AlertTriangle className="w-4 h-4 text-red-400 shrink-0" />
              <span>{errorMessage}</span>
            </div>
          )}

          {/* Formulário de Login */}
          <form onSubmit={handleLoginSubmit} className="space-y-4 pt-1">
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

            {/* Botão ENTRAR */}
            <button
              type="submit"
              className="w-full bg-[#ff6a00] hover:bg-[#e05e00] active:scale-[0.99] text-white font-heading font-black text-lg py-4 px-6 rounded-xl transition-all cursor-pointer shadow-lg shadow-[#ff6a00]/20 uppercase tracking-wider block mt-5"
            >
              ENTRAR
            </button>

            <div className="pt-3 text-center">
              <button
                type="button"
                onClick={() => {
                  setErrorMessage(null);
                  setSuccessMessage(null);
                  setViewMode('home');
                }}
                className="text-zinc-400 hover:text-[#ff6a00] text-xs sm:text-sm font-semibold transition-all cursor-pointer"
              >
                Não tem conta? <span className="underline font-bold text-white">Criar conta</span>
              </button>
            </div>
          </form>
        </div>
      </div>
    );
  }

  // PRIMEIRA PÁGINA DO RACE (VIEWMODE === 'HOME'):
  // Contém SOMENTE:
  // 1. CRIAR CONTA PASSAGEIRO
  // 2. CRIAR CONTA MOTOBOY E MOTORISTA
  // + Opção para entrar com login e senha
  return (
    <div className="min-h-screen bg-[#000000] text-white flex flex-col justify-center items-center px-6 py-12 selection:bg-[#ff6a00] selection:text-white">
      <div className="w-full max-w-sm sm:max-w-md space-y-8 animate-fade-in">
        {/* Topo: Marca RACE em destaque */}
        <div className="text-center space-y-2">
          <h1 className="text-6xl sm:text-7xl font-heading font-black text-[#ff6a00] tracking-tighter uppercase select-none">
            RACE
          </h1>
          <p className="text-zinc-300 font-medium text-base sm:text-lg tracking-wide">
            Mobilidade Urbana & Entregas
          </p>
          <p className="text-xs text-zinc-500 font-mono">
            Indaiatuba - SP
          </p>
        </div>

        {/* Somente as duas opções principais de criação de conta solicitadas pelo usuário */}
        <div className="space-y-4">
          {/* OPÇÃO 1: CRIAR CONTA PASSAGEIRO */}
          <button
            type="button"
            onClick={() => {
              setErrorMessage(null);
              setSuccessMessage(null);
              setViewMode('register_passenger');
            }}
            className="w-full p-5 bg-[#121212] hover:bg-[#1a1a1a] active:scale-[0.99] border-2 border-[#ff6a00]/40 hover:border-[#ff6a00] rounded-3xl transition-all cursor-pointer text-left flex items-center justify-between group shadow-xl shadow-[#ff6a00]/5"
          >
            <div className="flex items-center gap-4">
              <div className="w-14 h-14 rounded-2xl bg-[#ff6a00]/15 border border-[#ff6a00]/40 flex items-center justify-center shrink-0 group-hover:scale-105 transition-transform">
                <UserPlus className="w-7 h-7 text-[#ff6a00]" />
              </div>
              <div>
                <span className="font-heading font-black text-white text-base sm:text-lg block tracking-wide">
                  CRIAR CONTA PASSAGEIRO
                </span>
                <p className="text-xs sm:text-sm text-zinc-400 font-medium mt-0.5">
                  Peça corridas de carro, motoboy e entregas em Indaiatuba
                </p>
              </div>
            </div>
            <ArrowRight className="w-5 h-5 text-[#ff6a00] group-hover:translate-x-1 transition-transform shrink-0 ml-2" />
          </button>

          {/* OPÇÃO 2: CRIAR CONTA MOTOBOY E MOTORISTA */}
          <button
            type="button"
            onClick={() => {
              setErrorMessage(null);
              setSuccessMessage(null);
              setViewMode('select_category');
            }}
            className="w-full p-5 bg-[#141210] hover:bg-[#1f1a14] active:scale-[0.99] border-2 border-[#ff6a00] hover:border-[#ff8533] rounded-3xl transition-all cursor-pointer text-left flex items-center justify-between group shadow-xl shadow-[#ff6a00]/10"
          >
            <div className="flex items-center gap-4">
              <div className="w-14 h-14 rounded-2xl bg-[#ff6a00] text-slate-950 flex items-center justify-center shrink-0 group-hover:scale-105 transition-transform shadow-md">
                <div className="flex items-center -space-x-1">
                  <Car className="w-5 h-5 text-black" />
                  <Bike className="w-5 h-5 text-black" />
                </div>
              </div>
              <div>
                <span className="font-heading font-black text-white text-base sm:text-lg block tracking-wide">
                  CRIAR CONTA MOTOBOY E MOTORISTA
                </span>
                <p className="text-xs sm:text-sm text-zinc-400 font-medium mt-0.5">
                  100% dos ganhos livres • 0% comissões • Carro ou Moto
                </p>
              </div>
            </div>
            <ArrowRight className="w-5 h-5 text-[#ff6a00] group-hover:translate-x-1 transition-transform shrink-0 ml-2" />
          </button>
        </div>

        {/* Divisor e Botão para Entrar com Login e Senha */}
        <div className="pt-2 border-t border-zinc-800/80 text-center space-y-3">
          <p className="text-xs text-zinc-400 font-medium">
            Já possui uma conta cadastrada no RACE?
          </p>

          <button
            type="button"
            onClick={() => {
              setErrorMessage(null);
              setSuccessMessage(null);
              setViewMode('login_form');
            }}
            className="w-full py-4 px-5 rounded-2xl bg-[#181818] hover:bg-[#222222] active:scale-[0.99] border border-zinc-700 hover:border-zinc-500 text-white font-heading font-black text-sm transition-all cursor-pointer flex items-center justify-center gap-2 shadow-sm"
          >
            <LogIn className="w-4 h-4 text-[#ff6a00]" />
            <span>ENTRAR COM LOGIN E SENHA</span>
          </button>
        </div>
      </div>
    </div>
  );
};
