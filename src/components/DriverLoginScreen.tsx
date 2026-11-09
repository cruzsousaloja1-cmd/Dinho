import React, { useState } from 'react';
import { Driver, AppUser } from '../types';
import { Eye, EyeOff, AlertTriangle, UserPlus, LogIn, CheckCircle2, ArrowLeft } from 'lucide-react';
import confetti from 'canvas-confetti';
import { saveUserAccount, verifyUserLogin, getUserAccount } from '../services/userService';

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
  onRegisterPassengerSuccess,
}) => {
  // 1 cadastro só para entrar, depois escolhe como trabalhar dentro do app
  const [viewMode, setViewMode] = useState<'login' | 'register'>('login');

  // Estados do formulário de login
  const [loginEmail, setLoginEmail] = useState('');
  const [loginPassword, setLoginPassword] = useState('');
  const [showLoginPassword, setShowLoginPassword] = useState(false);
  const [loginErrorMessage, setLoginErrorMessage] = useState<string | null>(null);

  // Estados do cadastro único (Nome, Email, Celular, Senha)
  const [regName, setRegName] = useState('');
  const [regEmail, setRegEmail] = useState('');
  const [regPhone, setRegPhone] = useState('');
  const [regPassword, setRegPassword] = useState('');
  const [regConfirmPassword, setRegConfirmPassword] = useState('');
  const [showRegPassword, setShowRegPassword] = useState(false);
  const [regErrorMessage, setRegErrorMessage] = useState<string | null>(null);

  // Submit de Login
  const handleLoginSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    setLoginErrorMessage(null);

    const cleanEmail = loginEmail.trim().toLowerCase();
    if (!cleanEmail || !loginPassword) {
      setLoginErrorMessage('Por favor, informe seu e-mail e sua senha.');
      return;
    }

    // Valida credenciais e carrega dados isolados daquele usuário
    const result = verifyUserLogin(cleanEmail, loginPassword);
    if (!result.success || !result.user) {
      setLoginErrorMessage(result.error || 'E-mail ou senha incorretos.');
      return;
    }

    try {
      confetti({ particleCount: 50, spread: 60, origin: { y: 0.6 } });
    } catch {}

    onLoginSuccess(result.user, result.driver);
  };

  // Submit do Cadastro Único (Nome, Email, Celular, Senha) -> Login automático como PASSAGEIRO
  const handleRegisterSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    setRegErrorMessage(null);

    const cleanName = regName.trim();
    const cleanEmail = regEmail.trim().toLowerCase();
    const cleanPhone = regPhone.trim();

    if (!cleanName || !cleanEmail || !cleanPhone || !regPassword) {
      setRegErrorMessage('Por favor, preencha todos os campos obrigatórios (*).');
      return;
    }

    if (regPassword.length < 6) {
      setRegErrorMessage('A senha deve conter no mínimo 6 dígitos para sua segurança.');
      return;
    }

    if (regPassword !== regConfirmPassword) {
      setRegErrorMessage('A confirmação de senha não confere com a senha digitada.');
      return;
    }

    // Verifica se já existe conta com esse e-mail
    const existing = getUserAccount(cleanEmail);
    if (existing) {
      setRegErrorMessage('Já existe uma conta cadastrada com este e-mail. Faça login para continuar.');
      return;
    }

    const newUser: AppUser = {
      id: `psg-${Date.now().toString().slice(-6)}`,
      name: cleanName,
      email: cleanEmail,
      phone: cleanPhone,
      role: 'passenger',
      tipo: 'passenger',
      avatar: 'https://images.unsplash.com/photo-1535713875002-d1d0cf377fde?w=150&auto=format&fit=crop&q=80',
      rating: 5.0,
      password: regPassword,
    };

    // 1. Salva no localStorage com ID único race_user_${email} e race_current_user (com tipo inicial = passageiro)
    saveUserAccount({
      id: newUser.id,
      name: newUser.name,
      email: newUser.email,
      phone: newUser.phone,
      role: 'passenger',
      tipo: 'passenger',
      placa: '',
      password: regPassword,
      avatar: newUser.avatar,
      rating: 5.0,
      rides: [],
      createdAt: new Date().toISOString(),
    }, true);

    try {
      confetti({ particleCount: 70, spread: 75, origin: { y: 0.6 } });
    } catch {}

    onRegisterPassengerSuccess(newUser);

    // 2. Faz login automático imediatamente como passageiro (entra no app para pedir corrida)
    onLoginSuccess(newUser);
  };

  return (
    <div className="min-h-screen bg-[#000000] text-white flex flex-col justify-center items-center px-4 sm:px-6 py-10 selection:bg-[#ff6a00] selection:text-white">
      <div className="w-full max-w-sm sm:max-w-md space-y-7 animate-fade-in">
        {/* Topo Oficial RACE Laranja */}
        <div className="text-center space-y-1.5">
          <h1 className="text-6xl sm:text-7xl font-heading font-black text-[#ff6a00] tracking-tighter uppercase select-none">
            RACE
          </h1>
          <p className="text-zinc-300 font-medium text-sm sm:text-base tracking-wide">
            Mobilidade Urbana & Entregas
          </p>
          <p className="text-[11px] text-zinc-500 font-mono">
            Indaiatuba - SP
          </p>
        </div>

        {/* 1. MODO LOGIN */}
        {viewMode === 'login' && (
          <div className="space-y-6">
            {loginErrorMessage && (
              <div className="bg-red-950/80 border border-red-500/80 text-red-200 text-xs sm:text-sm p-3.5 rounded-2xl font-medium flex items-center gap-2.5 shadow-sm">
                <AlertTriangle className="w-4 h-4 text-red-400 shrink-0" />
                <span>{loginErrorMessage}</span>
              </div>
            )}

            <form onSubmit={handleLoginSubmit} className="space-y-4">
              <div className="space-y-1.5">
                <label className="text-zinc-300 text-xs font-bold uppercase tracking-wider block">
                  E-MAIL
                </label>
                <input
                  type="email"
                  required
                  value={loginEmail}
                  onChange={(e) => setLoginEmail(e.target.value)}
                  placeholder="seu.email@exemplo.com"
                  className="w-full bg-[#121212] border border-[#2a2a2a] text-white placeholder-zinc-500 rounded-2xl px-4 py-3.5 text-base focus:outline-none focus:border-[#ff6a00] transition-colors font-medium"
                />
              </div>

              <div className="space-y-1.5">
                <label className="text-zinc-300 text-xs font-bold uppercase tracking-wider block">
                  SENHA
                </label>
                <div className="relative">
                  <input
                    type={showLoginPassword ? 'text' : 'password'}
                    required
                    value={loginPassword}
                    onChange={(e) => setLoginPassword(e.target.value)}
                    placeholder="••••••••"
                    className="w-full bg-[#121212] border border-[#2a2a2a] text-white placeholder-zinc-500 rounded-2xl px-4 py-3.5 text-base focus:outline-none focus:border-[#ff6a00] transition-colors pr-12 font-medium"
                  />
                  <button
                    type="button"
                    onClick={() => setShowLoginPassword(!showLoginPassword)}
                    className="absolute right-4 top-3.5 text-zinc-400 hover:text-white transition-colors cursor-pointer"
                  >
                    {showLoginPassword ? <EyeOff className="w-5 h-5" /> : <Eye className="w-5 h-5" />}
                  </button>
                </div>
              </div>

              <button
                type="submit"
                className="w-full bg-[#ff6a00] hover:bg-[#e05e00] active:scale-[0.99] text-white font-heading font-black text-lg py-4 px-6 rounded-2xl transition-all cursor-pointer shadow-lg shadow-[#ff6a00]/25 uppercase tracking-wider block mt-5"
              >
                ENTRAR
              </button>
            </form>

            {/* SÓ 1 BOTÃO DE CADASTRO: "Novo Cadastro" / "Criar conta" */}
            <div className="pt-4 border-t border-zinc-800/80 text-center space-y-3">
              <p className="text-xs text-zinc-400 font-medium">
                Primeira vez no RACE? Crie sua conta em 30 segundos:
              </p>

              <button
                type="button"
                onClick={() => {
                  setRegErrorMessage(null);
                  setViewMode('register');
                }}
                className="w-full py-4 px-5 rounded-2xl bg-[#141414] hover:bg-[#1f1f1f] active:scale-[0.99] border-2 border-[#ff6a00]/50 hover:border-[#ff6a00] text-white font-heading font-black text-base transition-all cursor-pointer flex items-center justify-center gap-2.5 shadow-md group"
              >
                <UserPlus className="w-5 h-5 text-[#ff6a00] group-hover:scale-110 transition-transform" />
                <span>Novo Cadastro / Criar conta</span>
              </button>
            </div>
          </div>
        )}

        {/* 2. MODO CADASTRO ÚNICO (Nome, Email, Celular, Senha) */}
        {viewMode === 'register' && (
          <div className="space-y-5">
            <div className="flex items-center justify-between border-b border-zinc-800 pb-3">
              <button
                type="button"
                onClick={() => {
                  setLoginErrorMessage(null);
                  setViewMode('login');
                }}
                className="text-zinc-400 hover:text-white text-xs font-bold transition-all cursor-pointer flex items-center gap-1.5"
              >
                <ArrowLeft className="w-4 h-4" />
                <span>Voltar para Login</span>
              </button>
              <span className="text-[11px] font-mono font-bold text-[#ff6a00] uppercase">
                Cadastro Único
              </span>
            </div>

            <div className="space-y-1">
              <h2 className="text-2xl font-heading font-black text-white tracking-tight">
                CRIAR CONTA RACE
              </h2>
              <p className="text-xs text-zinc-400 font-medium">
                Preencha seus dados para entrar e começar a usar o app imediatamente:
              </p>
            </div>

            {regErrorMessage && (
              <div className="bg-red-950/80 border border-red-500/80 text-red-200 text-xs sm:text-sm p-3.5 rounded-2xl font-medium flex items-center gap-2.5 shadow-sm">
                <AlertTriangle className="w-4 h-4 text-red-400 shrink-0" />
                <span>{regErrorMessage}</span>
              </div>
            )}

            <form onSubmit={handleRegisterSubmit} className="space-y-3.5">
              <div className="space-y-1">
                <label className="text-zinc-300 text-xs font-bold uppercase tracking-wider block">
                  Nome Completo *
                </label>
                <input
                  type="text"
                  required
                  value={regName}
                  onChange={(e) => setRegName(e.target.value)}
                  placeholder="Ex: João da Silva"
                  className="w-full bg-[#121212] border border-[#2a2a2a] text-white placeholder-zinc-500 rounded-2xl px-4 py-3 text-sm sm:text-base focus:outline-none focus:border-[#ff6a00] transition-colors font-medium"
                />
              </div>

              <div className="space-y-1">
                <label className="text-zinc-300 text-xs font-bold uppercase tracking-wider block">
                  E-mail *
                </label>
                <input
                  type="email"
                  required
                  value={regEmail}
                  onChange={(e) => setRegEmail(e.target.value)}
                  placeholder="seu.email@exemplo.com"
                  className="w-full bg-[#121212] border border-[#2a2a2a] text-white placeholder-zinc-500 rounded-2xl px-4 py-3 text-sm sm:text-base focus:outline-none focus:border-[#ff6a00] transition-colors font-medium"
                />
              </div>

              <div className="space-y-1">
                <label className="text-zinc-300 text-xs font-bold uppercase tracking-wider block">
                  Celular / WhatsApp *
                </label>
                <input
                  type="tel"
                  required
                  value={regPhone}
                  onChange={(e) => setRegPhone(e.target.value)}
                  placeholder="(19) 99999-9999"
                  className="w-full bg-[#121212] border border-[#2a2a2a] text-white placeholder-zinc-500 rounded-2xl px-4 py-3 text-sm sm:text-base focus:outline-none focus:border-[#ff6a00] transition-colors font-medium"
                />
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 pt-1">
                <div className="space-y-1">
                  <label className="text-zinc-300 text-xs font-bold uppercase tracking-wider block">
                    Senha (mín. 6) *
                  </label>
                  <div className="relative">
                    <input
                      type={showRegPassword ? 'text' : 'password'}
                      required
                      value={regPassword}
                      onChange={(e) => setRegPassword(e.target.value)}
                      placeholder="••••••••"
                      className="w-full bg-[#121212] border border-[#2a2a2a] text-white placeholder-zinc-500 rounded-2xl px-4 py-3 text-sm sm:text-base focus:outline-none focus:border-[#ff6a00] transition-colors pr-10 font-medium"
                    />
                    <button
                      type="button"
                      onClick={() => setShowRegPassword(!showRegPassword)}
                      className="absolute right-3 top-3 text-zinc-400 hover:text-white transition-colors cursor-pointer"
                    >
                      {showRegPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                    </button>
                  </div>
                </div>

                <div className="space-y-1">
                  <label className="text-zinc-300 text-xs font-bold uppercase tracking-wider block">
                    Confirmar Senha *
                  </label>
                  <input
                    type={showRegPassword ? 'text' : 'password'}
                    required
                    value={regConfirmPassword}
                    onChange={(e) => setRegConfirmPassword(e.target.value)}
                    placeholder="••••••••"
                    className="w-full bg-[#121212] border border-[#2a2a2a] text-white placeholder-zinc-500 rounded-2xl px-4 py-3 text-sm sm:text-base focus:outline-none focus:border-[#ff6a00] transition-colors font-medium"
                  />
                </div>
              </div>

              <div className="p-3 bg-[#111111] border border-zinc-800 rounded-2xl text-[11px] text-zinc-400 space-y-1">
                <div className="flex items-center gap-1.5 text-zinc-300 font-bold">
                  <CheckCircle2 className="w-3.5 h-3.5 text-[#ff6a00]" />
                  <span>Login automático imediato como Passageiro</span>
                </div>
                <p>
                  Você poderá pedir corridas e, se quiser trabalhar, escolher sua categoria de motorista a qualquer momento na aba <strong>"Motorista"</strong> dentro do app.
                </p>
              </div>

              <button
                type="submit"
                className="w-full bg-[#ff6a00] hover:bg-[#e05e00] active:scale-[0.99] text-white font-heading font-black text-lg py-4 px-6 rounded-2xl transition-all cursor-pointer shadow-lg shadow-[#ff6a00]/25 uppercase tracking-wider block mt-3"
              >
                CRIAR CONTA E ENTRAR
              </button>

              <div className="text-center pt-2">
                <button
                  type="button"
                  onClick={() => {
                    setLoginErrorMessage(null);
                    setViewMode('login');
                  }}
                  className="text-zinc-400 hover:text-white text-xs font-medium cursor-pointer"
                >
                  Já tem conta? <span className="underline font-bold text-[#ff6a00]">Entrar com login e senha</span>
                </button>
              </div>
            </form>
          </div>
        )}
      </div>
    </div>
  );
};
