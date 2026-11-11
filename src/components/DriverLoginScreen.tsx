import React, { useState, useRef } from 'react';
import { Driver, AppUser, VehicleCategory } from '../types';
import { Eye, EyeOff, AlertTriangle, ArrowLeft, Car, Bike, User, CheckCircle2, ShieldCheck, Camera } from 'lucide-react';
import confetti from 'canvas-confetti';
import { saveUserAccount, verifyUserLogin, verifyUserLoginAsync, getUserAccount } from '../services/userService';
import { getUsuarioSupabase } from '../supabase';

interface DriverLoginScreenProps {
  drivers: Driver[];
  passengers?: AppUser[];
  onLoginSuccess: (user: AppUser, driver?: Driver) => void;
  onRegisterDriverSuccess: (user: AppUser, newDriver: Driver) => void;
  onRegisterMotoboySuccess?: (user: AppUser, newMotoboy: Driver) => void;
  onRegisterPassengerSuccess: (user: AppUser) => void;
}

type RegistrationRole = 'passenger' | 'driver' | 'motoboy';

export const DriverLoginScreen: React.FC<DriverLoginScreenProps> = ({
  drivers,
  passengers = [],
  onLoginSuccess,
  onRegisterDriverSuccess,
  onRegisterMotoboySuccess,
  onRegisterPassengerSuccess,
}) => {
  // Tela inicial: 'selection' (escolher tipo ou login), 'login' (entrar com credenciais), 'register' (formulário de 5 campos)
  const [viewMode, setViewMode] = useState<'selection' | 'login' | 'register'>('selection');
  const [regRole, setRegRole] = useState<RegistrationRole>('passenger');

  // Estados do formulário de login
  const [loginIdentifier, setLoginIdentifier] = useState(''); // Aceita E-mail ou Login
  const [loginPassword, setLoginPassword] = useState('');
  const [showLoginPassword, setShowLoginPassword] = useState(false);
  const [loginErrorMessage, setLoginErrorMessage] = useState<string | null>(null);
  const [isLoggingIn, setIsLoggingIn] = useState(false);

  // Estados do cadastro com 5 campos: Nome, E-mail, WhatsApp, Login, Senha
  const [regName, setRegName] = useState('');
  const [regEmail, setRegEmail] = useState('');
  const [regWhatsApp, setRegWhatsApp] = useState('');
  const [regLogin, setRegLogin] = useState('');
  const [regPassword, setRegPassword] = useState('');
  const [regConfirmPassword, setRegConfirmPassword] = useState('');
  const [showRegPassword, setShowRegPassword] = useState(false);
  const [regErrorMessage, setRegErrorMessage] = useState<string | null>(null);
  const [isRegistering, setIsRegistering] = useState(false);

  // Foto de perfil do cadastro (Galeria do Celular ou Câmera)
  const [regAvatar, setRegAvatar] = useState<string | null>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const handlePhotoSelect = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    const reader = new FileReader();
    reader.onload = (uploadEvent) => {
      const base64String = uploadEvent.target?.result as string;
      if (base64String) {
        setRegAvatar(base64String);
      }
    };
    reader.readAsDataURL(file);
  };

  // Iniciar fluxo de cadastro para a categoria escolhida
  const handleStartRegister = (role: RegistrationRole) => {
    setRegRole(role);
    setRegErrorMessage(null);
    setViewMode('register');
  };

  // Submit de Login (Nuvem Supabase + Fallback Local)
  const handleLoginSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoginErrorMessage(null);

    const cleanIdentifier = loginIdentifier.trim();
    if (!cleanIdentifier || !loginPassword) {
      setLoginErrorMessage('Por favor, informe seu Login ou E-mail e sua senha.');
      return;
    }

    setIsLoggingIn(true);
    try {
      // Valida credenciais no Supabase com fallback local
      const result = await verifyUserLoginAsync(cleanIdentifier, loginPassword);
      if (!result.success || !result.user) {
        setLoginErrorMessage(result.error || 'Credenciais inválidas. Verifique seu login e senha.');
        return;
      }

      try {
        confetti({ particleCount: 50, spread: 60, origin: { y: 0.6 } });
      } catch {}

      onLoginSuccess(result.user, result.driver);
    } catch {
      setLoginErrorMessage('Falha ao autenticar. Verifique sua conexão e tente novamente.');
    } finally {
      setIsLoggingIn(false);
    }
  };

  // Submit do Cadastro com 5 campos (Nome, E-mail, WhatsApp, Login, Senha) + FOTO OBRIGATÓRIA
  const handleRegisterSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setRegErrorMessage(null);

    // 1. Foto Obrigatória para TODAS as opções: Motorista, Motoboy, Passageiro
    if (!regAvatar) {
      setRegErrorMessage('Adicione sua foto para continuar');
      return;
    }

    const cleanName = regName.trim();
    const cleanEmail = regEmail.trim().toLowerCase();
    const cleanWhatsApp = regWhatsApp.trim();
    const cleanLogin = regLogin.trim().toLowerCase();

    if (!cleanName || !cleanEmail || !cleanWhatsApp || !cleanLogin || !regPassword) {
      setRegErrorMessage('Por favor, preencha todos os 5 campos obrigatórios (*).');
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

    setIsRegistering(true);
    try {
      // Verifica se já existe conta com esse e-mail (localmente ou no Supabase)
      const existingEmail = getUserAccount(cleanEmail);
      if (existingEmail) {
        setRegErrorMessage('Já existe uma conta cadastrada com este e-mail. Faça login para continuar.');
        return;
      }

      const cloudEmail = await getUsuarioSupabase(cleanEmail).catch(() => null);
      if (cloudEmail) {
        setRegErrorMessage('Já existe uma conta no sistema com este e-mail. Faça login para continuar.');
        return;
      }

      // Verifica se já existe conta com esse login
      const existingLogin = getUserAccount(cleanLogin);
      if (existingLogin) {
        setRegErrorMessage('Este login de usuário já está em uso. Por favor, escolha outro login.');
        return;
      }

      const cloudLogin = await getUsuarioSupabase(cleanLogin).catch(() => null);
      if (cloudLogin) {
        setRegErrorMessage('Este login de usuário já está em uso na nuvem. Por favor, escolha outro login.');
        return;
      }

      const isPassengerRole = regRole === 'passenger';
      const isDriverRole = regRole === 'driver';
      const isMotoboyRole = regRole === 'motoboy';

      const chosenAvatar = regAvatar;

    // Criação do novo motorista/motoboy se aplicável
    let newDriverObj: Driver | undefined = undefined;
    if (isDriverRole || isMotoboyRole) {
      const driverId = isMotoboyRole ? `moto-${Date.now().toString().slice(-6)}` : `drv-${Date.now().toString().slice(-6)}`;
      const category: VehicleCategory = isMotoboyRole ? 'moto_passageiro' : 'economica';

      newDriverObj = {
        id: driverId,
        name: cleanName,
        phone: cleanWhatsApp,
        email: cleanEmail,
        avatar: chosenAvatar,
        rating: 5.0,
        totalRides: 0,
        vehicleModel: isMotoboyRole ? 'Honda CG 160 Fan' : 'Chevrolet Onix 1.0',
        vehiclePlate: isMotoboyRole ? 'MTO-1A23' : 'RCE-2B34',
        vehicleColor: isMotoboyRole ? 'Vermelha' : 'Branco',
        vehicleYear: 2023,
        vehiclePhoto: isMotoboyRole
          ? 'https://images.unsplash.com/photo-1558981403-c5f9899a28bc?w=500&auto=format&fit=crop&q=80'
          : 'https://images.unsplash.com/photo-1549399542-7e3f8b79c341?w=500&auto=format&fit=crop&q=80',
        cpf: '123.456.789-00',
        cnh: '99887766554',
        category,
        weeklyPlanActive: false, // Inicia pendente de pagamento R$ 200/semana
        weeklyPlanPrice: 200,
        weeklyPlanExpiresAt: null,
        weeklyFeeExpiresAt: null,
        status: 'offline', // Ativado após pagamento PIX
        earningsToday: 0,
        earningsWeek: 0,
        cnhVerified: true,
        vehicleVerified: true,
        criminalRecordClear: true,
        lat: -23.0842,
        lng: -47.2118,
        registrationDate: new Date().toISOString(),
      };
    }

    const newUser: AppUser = {
      id: isPassengerRole ? `psg-${Date.now().toString().slice(-6)}` : newDriverObj!.id,
      name: cleanName,
      email: cleanEmail,
      phone: cleanWhatsApp,
      whatsapp: cleanWhatsApp,
      login: cleanLogin,
      role: isPassengerRole ? 'passenger' : isMotoboyRole ? 'motoboy' : 'driver',
      tipo: isPassengerRole ? 'passenger' : isMotoboyRole ? 'motoboy_passageiro' : 'motorista_economico',
      placa: newDriverObj?.vehiclePlate || '',
      avatar: chosenAvatar,
      rating: 5.0,
      password: regPassword,
      driverData: newDriverObj,
    };

    // Salva no localStorage isolado com chave race_user_${email} e define race_current_user
    saveUserAccount({
      id: newUser.id,
      name: newUser.name,
      email: newUser.email,
      phone: newUser.phone,
      whatsapp: newUser.whatsapp,
      login: newUser.login,
      role: newUser.role,
      tipo: newUser.tipo,
      placa: newUser.placa,
      password: regPassword,
      avatar: newUser.avatar,
      rating: 5.0,
      rides: [],
      driverData: newDriverObj,
      createdAt: new Date().toISOString(),
    }, true);

    try {
      confetti({ particleCount: 70, spread: 75, origin: { y: 0.6 } });
    } catch {}

    if (isPassengerRole) {
      onRegisterPassengerSuccess(newUser);
      // Passageiro entra direto na busca de corridas
      onLoginSuccess(newUser);
    } else if (isMotoboyRole) {
      if (onRegisterMotoboySuccess && newDriverObj) {
        onRegisterMotoboySuccess(newUser, newDriverObj);
      }
      onLoginSuccess(newUser, newDriverObj);
    } else {
      if (newDriverObj) {
        onRegisterDriverSuccess(newUser, newDriverObj);
      }
      onLoginSuccess(newUser, newDriverObj);
    }
  } catch (err: any) {
    setRegErrorMessage('Erro ao cadastrar. Verifique sua conexão e tente novamente.');
  } finally {
    setIsRegistering(false);
  }
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

        {/* 1. TELA PRINCIPAL: ESCOLHER ENTRE OS 3 CADASTROS OU ENTRAR */}
        {viewMode === 'selection' && (
          <div className="space-y-6">
            <div className="text-center space-y-1 pb-1">
              <h2 className="text-xl sm:text-2xl font-heading font-black text-white uppercase tracking-tight">
                Seja Bem-Vindo(a)
              </h2>
              <p className="text-xs text-zinc-400 font-medium">
                Escolha abaixo como deseja se cadastrar na plataforma RACE:
              </p>
            </div>

            {/* Os 3 Botões de Cadastro Oficiais */}
            <div className="space-y-3">
              {/* 1. Cadastro de Passageiro */}
              <button
                type="button"
                onClick={() => handleStartRegister('passenger')}
                className="w-full p-4 rounded-2xl bg-[#121212] hover:bg-[#1a1a1a] border-2 border-emerald-500/60 hover:border-emerald-400 active:scale-[0.99] text-left transition-all cursor-pointer flex items-center justify-between group shadow-lg"
              >
                <div className="flex items-center gap-3.5">
                  <div className="w-12 h-12 rounded-2xl bg-emerald-500/15 text-emerald-400 border border-emerald-500/40 flex items-center justify-center shrink-0 group-hover:scale-105 transition-transform">
                    <User className="w-6 h-6" />
                  </div>
                  <div>
                    <h3 className="font-heading font-black text-white text-base sm:text-lg group-hover:text-emerald-300 transition-colors">
                      Cadastro de Passageiro
                    </h3>
                    <p className="text-xs text-zinc-400 font-medium">
                      Peça corridas e viagens em Indaiatuba direto no app
                    </p>
                  </div>
                </div>
                <span className="text-emerald-400 text-xs font-mono font-bold uppercase tracking-wider hidden sm:block">
                  Entrar
                </span>
              </button>

              {/* 2. Cadastro de Motorista */}
              <button
                type="button"
                onClick={() => handleStartRegister('driver')}
                className="w-full p-4 rounded-2xl bg-[#121212] hover:bg-[#1a1a1a] border-2 border-[#ff6a00]/70 hover:border-[#ff6a00] active:scale-[0.99] text-left transition-all cursor-pointer flex items-center justify-between group shadow-lg"
              >
                <div className="flex items-center gap-3.5">
                  <div className="w-12 h-12 rounded-2xl bg-[#ff6a00]/15 text-[#ff6a00] border border-[#ff6a00]/40 flex items-center justify-center shrink-0 group-hover:scale-105 transition-transform">
                    <Car className="w-6 h-6" />
                  </div>
                  <div>
                    <h3 className="font-heading font-black text-white text-base sm:text-lg group-hover:text-[#ff8533] transition-colors">
                      Cadastro de Motorista
                    </h3>
                    <p className="text-xs text-zinc-400 font-medium">
                      Carro próprio &bull; 100% de repasse &bull; R$200/semana
                    </p>
                  </div>
                </div>
                <span className="text-[#ff6a00] text-xs font-mono font-bold uppercase tracking-wider hidden sm:block">
                  Trabalhar
                </span>
              </button>

              {/* 3. Cadastro de Motoboy */}
              <button
                type="button"
                onClick={() => handleStartRegister('motoboy')}
                className="w-full p-4 rounded-2xl bg-[#121212] hover:bg-[#1a1a1a] border-2 border-cyan-500/60 hover:border-cyan-400 active:scale-[0.99] text-left transition-all cursor-pointer flex items-center justify-between group shadow-lg"
              >
                <div className="flex items-center gap-3.5">
                  <div className="w-12 h-12 rounded-2xl bg-cyan-500/15 text-cyan-400 border border-cyan-500/40 flex items-center justify-center shrink-0 group-hover:scale-105 transition-transform">
                    <Bike className="w-6 h-6" />
                  </div>
                  <div>
                    <h3 className="font-heading font-black text-white text-base sm:text-lg group-hover:text-cyan-300 transition-colors">
                      Cadastro de Motoboy
                    </h3>
                    <p className="text-xs text-zinc-400 font-medium">
                      Moto táxi ou entregas &bull; 100% dos ganhos livres
                    </p>
                  </div>
                </div>
                <span className="text-cyan-400 text-xs font-mono font-bold uppercase tracking-wider hidden sm:block">
                  Trabalhar
                </span>
              </button>
            </div>

            {/* Divisor com Botão de Login para quem já possui conta */}
            <div className="pt-4 border-t border-zinc-800 text-center space-y-3">
              <p className="text-xs text-zinc-400 font-medium">
                Já possui cadastro no RACE?
              </p>
              <button
                type="button"
                onClick={() => {
                  setLoginErrorMessage(null);
                  setViewMode('login');
                }}
                className="w-full py-4 px-5 rounded-2xl bg-[#161616] hover:bg-[#202020] border border-zinc-700 hover:border-zinc-500 text-white font-heading font-black text-base transition-all cursor-pointer shadow-md uppercase tracking-wider"
              >
                ENTRAR COM LOGIN E SENHA
              </button>
            </div>
          </div>
        )}

        {/* 2. MODO LOGIN (Login ou E-mail + Senha) */}
        {viewMode === 'login' && (
          <div className="space-y-6">
            <div className="flex items-center justify-between border-b border-zinc-800 pb-3">
              <button
                type="button"
                onClick={() => {
                  setLoginErrorMessage(null);
                  setViewMode('selection');
                }}
                className="text-zinc-400 hover:text-white text-xs font-bold transition-all cursor-pointer flex items-center gap-1.5"
              >
                <ArrowLeft className="w-4 h-4" />
                <span>Voltar às opções</span>
              </button>
              <span className="text-[11px] font-mono font-bold text-[#ff6a00] uppercase">
                Acesso Seguro
              </span>
            </div>

            {loginErrorMessage && (
              <div className="bg-red-950/80 border border-red-500/80 text-red-200 text-xs sm:text-sm p-3.5 rounded-2xl font-medium flex items-center gap-2.5 shadow-sm">
                <AlertTriangle className="w-4 h-4 text-red-400 shrink-0" />
                <span>{loginErrorMessage}</span>
              </div>
            )}

            <form onSubmit={handleLoginSubmit} className="space-y-4">
              <div className="space-y-1.5">
                <label className="text-zinc-300 text-xs font-bold uppercase tracking-wider block">
                  LOGIN OU E-MAIL
                </label>
                <input
                  type="text"
                  required
                  value={loginIdentifier}
                  onChange={(e) => setLoginIdentifier(e.target.value)}
                  placeholder="Seu login de usuário ou e-mail"
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
                disabled={isLoggingIn}
                className="w-full bg-[#ff6a00] hover:bg-[#e05e00] disabled:opacity-60 active:scale-[0.99] text-white font-heading font-black text-lg py-4 px-6 rounded-2xl transition-all cursor-pointer shadow-lg shadow-[#ff6a00]/25 uppercase tracking-wider block mt-5"
              >
                {isLoggingIn ? 'ENTRANDO NA NUVEM...' : 'ENTRAR NO RACE'}
              </button>
            </form>

            {/* Atalhos para criar conta */}
            <div className="pt-4 border-t border-zinc-800 text-center space-y-2">
              <p className="text-xs text-zinc-400 font-medium">
                Ainda não tem conta? Escolha seu cadastro:
              </p>
              <div className="grid grid-cols-3 gap-2 pt-1">
                <button
                  type="button"
                  onClick={() => handleStartRegister('passenger')}
                  className="p-2.5 rounded-xl bg-[#141414] hover:bg-[#1f1f1f] border border-emerald-500/40 text-emerald-400 font-heading font-black text-xs transition-all cursor-pointer"
                >
                  Passageiro
                </button>
                <button
                  type="button"
                  onClick={() => handleStartRegister('driver')}
                  className="p-2.5 rounded-xl bg-[#141414] hover:bg-[#1f1f1f] border border-[#ff6a00]/40 text-[#ff6a00] font-heading font-black text-xs transition-all cursor-pointer"
                >
                  Motorista
                </button>
                <button
                  type="button"
                  onClick={() => handleStartRegister('motoboy')}
                  className="p-2.5 rounded-xl bg-[#141414] hover:bg-[#1f1f1f] border border-cyan-500/40 text-cyan-400 font-heading font-black text-xs transition-all cursor-pointer"
                >
                  Motoboy
                </button>
              </div>
            </div>
          </div>
        )}

        {/* 3. MODO CADASTRO COM OS 5 CAMPOS (Nome, E-mail, WhatsApp, Login, Senha) */}
        {viewMode === 'register' && (
          <div className="space-y-5">
            <div className="flex items-center justify-between border-b border-zinc-800 pb-3">
              <button
                type="button"
                onClick={() => {
                  setRegErrorMessage(null);
                  setViewMode('selection');
                }}
                className="text-zinc-400 hover:text-white text-xs font-bold transition-all cursor-pointer flex items-center gap-1.5"
              >
                <ArrowLeft className="w-4 h-4" />
                <span>Voltar às opções</span>
              </button>
              <span className={`text-[11px] font-mono font-bold uppercase px-2 py-0.5 rounded-full border ${
                regRole === 'passenger'
                  ? 'bg-emerald-500/20 text-emerald-400 border-emerald-500/40'
                  : regRole === 'driver'
                  ? 'bg-[#ff6a00]/20 text-[#ff6a00] border-[#ff6a00]/40'
                  : 'bg-cyan-500/20 text-cyan-400 border-cyan-500/40'
              }`}>
                {regRole === 'passenger' ? 'Passageiro' : regRole === 'driver' ? 'Motorista' : 'Motoboy'}
              </span>
            </div>

            <div className="space-y-1">
              <h2 className="text-2xl font-heading font-black text-white tracking-tight">
                {regRole === 'passenger' && 'CADASTRO DE PASSAGEIRO'}
                {regRole === 'driver' && 'CADASTRO DE MOTORISTA'}
                {regRole === 'motoboy' && 'CADASTRO DE MOTOBOY'}
              </h2>
              <p className="text-xs text-zinc-400 font-medium">
                {regRole === 'passenger' && 'Preencha os 5 campos abaixo para entrar direto na busca de corridas:'}
                {regRole === 'driver' && 'Preencha os 5 campos para liberar sua conta de motorista com 100% dos ganhos:'}
                {regRole === 'motoboy' && 'Preencha os 5 campos para rodar como motoboy em passageiro ou entregas:'}
              </p>
            </div>

            {regErrorMessage && (
              <div className="bg-red-950/80 border border-red-500/80 text-red-200 text-xs sm:text-sm p-3.5 rounded-2xl font-medium flex items-center gap-2.5 shadow-sm">
                <AlertTriangle className="w-4 h-4 text-red-400 shrink-0" />
                <span>{regErrorMessage}</span>
              </div>
            )}

            <form onSubmit={handleRegisterSubmit} className="space-y-3">
              {/* Círculo de Foto da Galeria do Celular no Topo do Cadastro - OBRIGATÓRIA */}
              <div className="flex flex-col items-center justify-center py-2">
                <input
                  ref={fileInputRef}
                  type="file"
                  accept="image/*"
                  onChange={handlePhotoSelect}
                  className="hidden"
                  id="reg-avatar-input"
                />

                <div
                  onClick={() => fileInputRef.current?.click()}
                  className="relative group cursor-pointer"
                >
                  <div className={`w-28 h-28 sm:w-32 sm:h-32 rounded-full border-4 flex items-center justify-center overflow-hidden transition-all shadow-2xl relative ${
                    regAvatar
                      ? 'border-[#ff6a00] bg-zinc-900 ring-4 ring-[#ff6a00]/30'
                      : 'border-dashed border-amber-500 bg-amber-950/20 hover:bg-zinc-900 animate-pulse'
                  }`}>
                    {regAvatar ? (
                      <img
                        src={regAvatar}
                        alt="Foto do perfil"
                        className="w-full h-full object-cover"
                      />
                    ) : (
                      <div className="flex flex-col items-center justify-center text-zinc-300 group-hover:text-white transition-colors p-2 text-center">
                        <Camera className="w-9 h-9 text-[#ff6a00] mb-1 group-hover:scale-110 transition-transform" />
                        <span className="text-[11px] font-heading font-black uppercase tracking-wider text-white">
                          Adicionar foto
                        </span>
                        <span className="text-[9px] text-amber-400 font-bold uppercase mt-0.5">
                          * Obrigatória
                        </span>
                      </div>
                    )}
                  </div>

                  <button
                    type="button"
                    onClick={(e) => {
                      e.stopPropagation();
                      fileInputRef.current?.click();
                    }}
                    className="absolute bottom-0 right-0 p-2.5 rounded-full bg-[#ff6a00] hover:bg-[#e05e00] text-white shadow-lg border-2 border-black transition-all cursor-pointer active:scale-90"
                    title={regAvatar ? "Trocar foto da galeria" : "Escolher foto da galeria"}
                  >
                    <Camera className="w-4 h-4" />
                  </button>
                </div>

                <div className="flex items-center gap-2 mt-2">
                  <button
                    type="button"
                    onClick={() => fileInputRef.current?.click()}
                    className="text-xs font-heading font-black text-[#ff6a00] hover:text-[#ff8533] transition-colors cursor-pointer flex items-center gap-1.5 uppercase tracking-wider"
                  >
                    <Camera className="w-3.5 h-3.5" />
                    <span>{regAvatar ? 'Trocar foto da galeria' : 'Adicionar foto da Galeria'}</span>
                  </button>
                  {regAvatar ? (
                    <span className="text-[10px] bg-emerald-950 text-emerald-400 border border-emerald-500/40 px-2 py-0.5 rounded-full font-bold">
                      ✓ Foto anexada
                    </span>
                  ) : (
                    <span className="text-[10px] bg-amber-950/70 text-amber-300 border border-amber-500/50 px-2 py-0.5 rounded-full font-bold">
                      * Obrigatória
                    </span>
                  )}
                </div>
              </div>

              {/* 1. Nome Completo */}
              <div className="space-y-1">
                <label className="text-zinc-300 text-xs font-bold uppercase tracking-wider block">
                  1. Nome Completo *
                </label>
                <input
                  type="text"
                  required
                  value={regName}
                  onChange={(e) => setRegName(e.target.value)}
                  placeholder="Ex: João da Silva"
                  className="w-full bg-[#121212] border border-[#2a2a2a] text-white placeholder-zinc-500 rounded-2xl px-4 py-3 text-sm focus:outline-none focus:border-[#ff6a00] transition-colors font-medium"
                />
              </div>

              {/* 2. E-mail */}
              <div className="space-y-1">
                <label className="text-zinc-300 text-xs font-bold uppercase tracking-wider block">
                  2. E-mail *
                </label>
                <input
                  type="email"
                  required
                  value={regEmail}
                  onChange={(e) => setRegEmail(e.target.value)}
                  placeholder="seu.email@exemplo.com"
                  className="w-full bg-[#121212] border border-[#2a2a2a] text-white placeholder-zinc-500 rounded-2xl px-4 py-3 text-sm focus:outline-none focus:border-[#ff6a00] transition-colors font-medium"
                />
              </div>

              {/* 3. WhatsApp */}
              <div className="space-y-1">
                <label className="text-zinc-300 text-xs font-bold uppercase tracking-wider block">
                  3. WhatsApp / Celular *
                </label>
                <input
                  type="tel"
                  required
                  value={regWhatsApp}
                  onChange={(e) => setRegWhatsApp(e.target.value)}
                  placeholder="(19) 99999-9999"
                  className="w-full bg-[#121212] border border-[#2a2a2a] text-white placeholder-zinc-500 rounded-2xl px-4 py-3 text-sm focus:outline-none focus:border-[#ff6a00] transition-colors font-medium"
                />
              </div>

              {/* 4. Login */}
              <div className="space-y-1">
                <label className="text-zinc-300 text-xs font-bold uppercase tracking-wider block">
                  4. Login (Nome de Usuário) *
                </label>
                <input
                  type="text"
                  required
                  value={regLogin}
                  onChange={(e) => setRegLogin(e.target.value)}
                  placeholder="Ex: joao.indaiatuba"
                  className="w-full bg-[#121212] border border-[#2a2a2a] text-white placeholder-zinc-500 rounded-2xl px-4 py-3 text-sm focus:outline-none focus:border-[#ff6a00] transition-colors font-medium font-mono"
                />
              </div>

              {/* 5. Senha */}
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 pt-1">
                <div className="space-y-1">
                  <label className="text-zinc-300 text-xs font-bold uppercase tracking-wider block">
                    5. Senha (mín. 6) *
                  </label>
                  <div className="relative">
                    <input
                      type={showRegPassword ? 'text' : 'password'}
                      required
                      value={regPassword}
                      onChange={(e) => setRegPassword(e.target.value)}
                      placeholder="••••••••"
                      className="w-full bg-[#121212] border border-[#2a2a2a] text-white placeholder-zinc-500 rounded-2xl px-4 py-3 text-sm focus:outline-none focus:border-[#ff6a00] transition-colors pr-10 font-medium"
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
                    className="w-full bg-[#121212] border border-[#2a2a2a] text-white placeholder-zinc-500 rounded-2xl px-4 py-3 text-sm focus:outline-none focus:border-[#ff6a00] transition-colors font-medium"
                  />
                </div>
              </div>

              {/* Aviso da Assinatura para Motorista/Motoboy */}
              {(regRole === 'driver' || regRole === 'motoboy') && (
                <div className="p-3.5 bg-amber-950/40 border border-amber-500/50 rounded-2xl text-xs text-amber-200 space-y-1">
                  <div className="flex items-center gap-1.5 font-bold text-amber-400">
                    <ShieldCheck className="w-4 h-4" />
                    <span>Plano Semanal: R$ 200/semana (100% dos Ganhos Livres)</span>
                  </div>
                  <p className="text-[11px] text-zinc-300">
                    Chave PIX Oficial:{' '}
                    <span className="font-mono font-bold text-[#ff6a00] select-all">
                      9d9e5635-9e68-46bf-bffe-08bdae29c8ba
                    </span>
                  </p>
                </div>
              )}

              {regRole === 'passenger' && (
                <div className="p-3 bg-emerald-950/30 border border-emerald-500/40 rounded-2xl text-[11px] text-emerald-200 flex items-center gap-2">
                  <CheckCircle2 className="w-4 h-4 text-emerald-400 shrink-0" />
                  <span>Ao cadastrar, você entra direto na busca de corridas no mapa!</span>
                </div>
              )}

              {!regAvatar && (
                <div className="p-3 bg-amber-950/60 border border-amber-500/70 rounded-2xl text-xs text-amber-200 flex items-center gap-2.5 font-bold">
                  <AlertTriangle className="w-4 h-4 text-amber-400 shrink-0" />
                  <span>Adicione sua foto para continuar</span>
                </div>
              )}

              <button
                type="submit"
                disabled={!regAvatar || isRegistering}
                className={`w-full font-heading font-black text-base sm:text-lg py-4 px-6 rounded-2xl transition-all uppercase tracking-wider block mt-3 ${
                  regAvatar && !isRegistering
                    ? 'bg-[#ff6a00] hover:bg-[#e05e00] active:scale-[0.99] text-white cursor-pointer shadow-lg shadow-[#ff6a00]/25'
                    : 'bg-zinc-800 text-zinc-500 cursor-not-allowed border border-zinc-700 opacity-60'
                }`}
              >
                {isRegistering
                  ? 'CRIANDO CONTA NA NUVEM...'
                  : regAvatar
                  ? 'CRIAR CONTA E ENTRAR'
                  : '📸 ADICIONE SUA FOTO PARA CONTINUAR'}
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
