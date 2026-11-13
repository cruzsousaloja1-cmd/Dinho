import React, { useState, useRef } from 'react';
import { Driver, AppUser, VehicleCategory } from '../types';
import { Eye, EyeOff, AlertTriangle, ArrowLeft, Car, Bike, User, CheckCircle2, ShieldCheck, Camera } from 'lucide-react';
import confetti from 'canvas-confetti';
import { saveUserAccount, verifyUserLogin, getUserAccount, updateUserPasswordLocal } from '../services/userService';
import { insertUsuarioSupabase, loginUsuarioSupabase, getUsuarioSupabase } from '../supabase';
import { ForgotPasswordModal } from './ForgotPasswordModal';

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
  // Tela inicial: 'selection', 'login', 'admin_login', 'admin_register', 'register'
  const [viewMode, setViewMode] = useState<'selection' | 'login' | 'admin_login' | 'admin_register' | 'register'>('selection');
  const [regRole, setRegRole] = useState<RegistrationRole>('passenger');

  // Estados do formulário de login
  const [loginIdentifier, setLoginIdentifier] = useState(''); // Aceita E-mail ou Login
  const [loginPassword, setLoginPassword] = useState('');
  const [showLoginPassword, setShowLoginPassword] = useState(false);
  const [loginErrorMessage, setLoginErrorMessage] = useState<string | null>(null);
  const [loginSuccessMessage, setLoginSuccessMessage] = useState<string | null>(null);
  const [isLoggingIn, setIsLoggingIn] = useState(false);
  const [isForgotPasswordOpen, setIsForgotPasswordOpen] = useState(false);

  // Estados do formulário CRIAR CONTA DE ADM - PRIMEIRA VEZ
  const [adminRegName, setAdminRegName] = useState('');
  const [adminRegEmail, setAdminRegEmail] = useState('admin@race.com.br');
  const [adminRegWhatsApp, setAdminRegWhatsApp] = useState('');
  const [adminRegPassword, setAdminRegPassword] = useState('');
  const [adminRegConfirmPassword, setAdminRegConfirmPassword] = useState('');
  const [showAdminRegPassword, setShowAdminRegPassword] = useState(false);
  const [showAdminRegConfirmPassword, setShowAdminRegConfirmPassword] = useState(false);
  const [adminRegErrorMessage, setAdminRegErrorMessage] = useState<string | null>(null);
  const [adminRegSuccessMessage, setAdminRegSuccessMessage] = useState<string | null>(null);
  const [isCreatingAdmin, setIsCreatingAdmin] = useState(false);

  // Estados do cadastro com 5 campos: Nome, E-mail, WhatsApp, Login, Senha
  const [regName, setRegName] = useState('');
  const [regEmail, setRegEmail] = useState('');
  const [regWhatsApp, setRegWhatsApp] = useState('');
  const [regLogin, setRegLogin] = useState('');
  const [regPassword, setRegPassword] = useState('');
  const [regConfirmPassword, setRegConfirmPassword] = useState('');
  const [showRegPassword, setShowRegPassword] = useState(false);
  const [regErrorMessage, setRegErrorMessage] = useState<string | null>(null);
  const [regSuccessMessage, setRegSuccessMessage] = useState<string | null>(null);
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
    setRegSuccessMessage(null);
    setViewMode('register');
  };

  const handleOpenAdminRegister = (prefillEmail?: string) => {
    setAdminRegErrorMessage(null);
    setAdminRegSuccessMessage(null);
    setAdminRegName('');
    setAdminRegEmail(
      prefillEmail && prefillEmail.trim().includes('@')
        ? prefillEmail.trim().toLowerCase()
        : 'admin@race.com.br'
    );
    setAdminRegWhatsApp('');
    setAdminRegPassword('');
    setAdminRegConfirmPassword('');
    setShowAdminRegPassword(false);
    setShowAdminRegConfirmPassword(false);
    setViewMode('admin_register');
  };

  // Submit de Criação de Conta ADM pela Primeira Vez (salva no Supabase com tipo = ADM)
  const handleCreateAdminSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setAdminRegErrorMessage(null);
    setAdminRegSuccessMessage(null);

    const cleanName = adminRegName.trim();
    const cleanEmail = adminRegEmail.trim().toLowerCase();
    const cleanWhatsApp = adminRegWhatsApp.trim();

    if (!cleanName || !cleanEmail || !cleanWhatsApp || !adminRegPassword || !adminRegConfirmPassword) {
      setAdminRegErrorMessage('Por favor, preencha todos os campos obrigatórios.');
      return;
    }

    if (adminRegPassword.length < 6) {
      setAdminRegErrorMessage('A senha do ADM deve conter no mínimo 6 caracteres.');
      return;
    }

    if (adminRegPassword !== adminRegConfirmPassword) {
      setAdminRegErrorMessage('As senhas não conferem');
      return;
    }

    setIsCreatingAdmin(true);
    try {
      // Verifica se já existe conta com este e-mail no Supabase
      const existingCloud = await getUsuarioSupabase(cleanEmail).catch(() => null);
      if (existingCloud) {
        setAdminRegErrorMessage(
          'Já existe um usuário cadastrado com este e-mail. Volte para ENTRAR NO ADM ou use Esqueci a senha.'
        );
        return;
      }

      // Salva na tabela public.usuarios no Supabase com tipo = 'ADM'
      const supabaseRes = await insertUsuarioSupabase({
        nome: cleanName,
        email: cleanEmail,
        celular: cleanWhatsApp,
        senha: adminRegPassword,
        tipo: 'ADM',
      });

      if (!supabaseRes.success) {
        setAdminRegErrorMessage(`Erro ao salvar ADM no Supabase: ${supabaseRes.error || 'Falha no banco de dados'}`);
        return;
      }

      const createdRow = supabaseRes.data;
      const adminUser: AppUser = {
        id: createdRow?.id ? `usr-${createdRow.id}` : `usr-adm-${Date.now()}`,
        name: cleanName,
        email: cleanEmail,
        phone: cleanWhatsApp,
        whatsapp: cleanWhatsApp,
        login: cleanEmail,
        role: 'admin',
        tipo: 'ADM',
        isAdmin: true,
        placa: 'ADMIN-01',
        rating: 5.0,
      };

      saveUserAccount(
        {
          id: adminUser.id,
          name: adminUser.name,
          email: adminUser.email,
          phone: adminUser.phone,
          whatsapp: adminUser.whatsapp,
          login: adminUser.login,
          role: 'admin',
          tipo: 'ADM',
          placa: 'ADMIN-01',
          password: adminRegPassword,
          rating: 5.0,
          createdAt: new Date().toISOString(),
        },
        true
      );
      updateUserPasswordLocal(cleanEmail, adminRegPassword);

      setAdminRegSuccessMessage('Conta de ADM criada e salva no Supabase com sucesso!');
      try { confetti({ particleCount: 70, spread: 75, origin: { y: 0.6 } }); } catch {}

      setTimeout(() => {
        onLoginSuccess(adminUser);
      }, 600);
    } catch (err: any) {
      setAdminRegErrorMessage(`Erro ao criar conta ADM: ${err?.message || 'Verifique sua conexão e tente novamente.'}`);
    } finally {
      setIsCreatingAdmin(false);
    }
  };

  // Submit de Login - Busca o usuário diretamente na tabela "usuarios" no Supabase pelo email + senha
  const handleLoginSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoginErrorMessage(null);
    setLoginSuccessMessage(null);

    const cleanIdentifier = loginIdentifier.trim().toLowerCase();
    if (!cleanIdentifier || !loginPassword) {
      setLoginErrorMessage('Por favor, informe seu E-mail ou Login e sua senha.');
      return;
    }

    setIsLoggingIn(true);
    try {
      // FLUXO DEDICADO DA TELA ADM (aceita conta criada com tipo = ADM/admin ou admin@race.com.br)
      if (viewMode === 'admin_login') {
        // 1. Tenta autenticar no Supabase primeiro
        const cloudAdminRes = await loginUsuarioSupabase(cleanIdentifier, loginPassword);
        if (cloudAdminRes.success && cloudAdminRes.data) {
          const row = cloudAdminRes.data;
          const rowEmail = (row['e-mail'] || row.email || cleanIdentifier).toLowerCase().trim();
          const rowTipo = String(row.tipo || '').toUpperCase();
          const isRowAdmin = rowTipo === 'ADM' || rowTipo === 'ADMIN' || rowEmail === 'admin@race.com.br';

          if (!isRowAdmin) {
            setLoginErrorMessage('Acesso restrito');
            return;
          }

          const adminUser: AppUser = {
            id: row.id ? `usr-${row.id}` : 'usr-admin-master',
            name: row.nome || 'Administrador Geral',
            email: rowEmail,
            phone: row.celular || '(19) 99999-0000',
            whatsapp: row.celular || '(19) 99999-0000',
            login: rowEmail,
            role: 'admin',
            tipo: 'ADM',
            isAdmin: true,
            placa: 'ADMIN-01',
            rating: 5.0,
          };

          saveUserAccount(
            {
              ...adminUser,
              password: row.senha || loginPassword,
              createdAt: row.data_cadastro || new Date().toISOString(),
            },
            true
          );

          setLoginSuccessMessage('Acesso ADM liberado!');
          try { confetti({ particleCount: 50, spread: 60, origin: { y: 0.6 } }); } catch {}
          setTimeout(() => {
            onLoginSuccess(adminUser);
          }, 300);
          return;
        }

        // 2. Fallback local (ex: senha mestre ou conta ADM salva offline)
        const localAdminRes = verifyUserLogin(cleanIdentifier, loginPassword);
        if (localAdminRes.success && localAdminRes.user) {
          const isLocalAdmin =
            localAdminRes.user.role === 'admin' ||
            localAdminRes.user.isAdmin ||
            String(localAdminRes.user.tipo || '').toUpperCase() === 'ADM' ||
            localAdminRes.user.email.toLowerCase() === 'admin@race.com.br';

          if (!isLocalAdmin) {
            setLoginErrorMessage('Acesso restrito');
            return;
          }

          setLoginSuccessMessage('Acesso ADM liberado!');
          try { confetti({ particleCount: 50, spread: 60, origin: { y: 0.6 } }); } catch {}
          setTimeout(() => {
            onLoginSuccess(localAdminRes.user!);
          }, 300);
          return;
        }

        // 3. Verifica se o usuário existe mas não tem perfil ADM -> exibe "Acesso restrito"
        const existingUser = await getUsuarioSupabase(cleanIdentifier).catch(() => null);
        if (existingUser) {
          const existingTipo = String(existingUser.tipo || '').toUpperCase();
          const existingEmail = (existingUser['e-mail'] || existingUser.email || '').toLowerCase().trim();
          if (existingTipo !== 'ADM' && existingTipo !== 'ADMIN' && existingEmail !== 'admin@race.com.br') {
            setLoginErrorMessage('Acesso restrito');
            return;
          }
          setLoginErrorMessage('Senha incorreta para a conta ADM.');
          return;
        }

        setLoginErrorMessage(
          cleanIdentifier === 'admin@race.com.br'
            ? 'Acesso restrito — senha incorreta ou conta ADM ainda não criada.'
            : 'Acesso restrito'
        );
        return;
      }

      // 0. Conta Mestre de Administrador (quando entra pelo login geral com admin@race.com.br)
      if (cleanIdentifier === 'admin@race.com.br') {
        const cloudAdmin = await loginUsuarioSupabase(cleanIdentifier, loginPassword);
        if (cloudAdmin.success && cloudAdmin.data) {
          const row = cloudAdmin.data;
          const adminUser: AppUser = {
            id: row.id ? `usr-${row.id}` : 'usr-admin-master',
            name: row.nome || 'Administrador Geral',
            email: 'admin@race.com.br',
            phone: row.celular || '(19) 99999-0000',
            role: 'admin',
            tipo: 'ADM',
            isAdmin: true,
            placa: 'ADMIN-01',
            rating: 5.0,
          };
          saveUserAccount({ ...adminUser, password: loginPassword, createdAt: new Date().toISOString() }, true);
          setLoginSuccessMessage('Acesso ADM liberado!');
          try { confetti({ particleCount: 50, spread: 60, origin: { y: 0.6 } }); } catch {}
          setTimeout(() => {
            onLoginSuccess(adminUser);
          }, 300);
          return;
        }

        const result = verifyUserLogin(cleanIdentifier, loginPassword);
        if (!result.success || !result.user) {
          setLoginErrorMessage(result.error || 'Credenciais inválidas para o Administrador.');
          return;
        }
        setLoginSuccessMessage('Acesso ADM liberado!');
        try { confetti({ particleCount: 50, spread: 60, origin: { y: 0.6 } }); } catch {}
        setTimeout(() => {
          onLoginSuccess(result.user!, result.driver);
        }, 300);
        return;
      }

      // 1. Busca direta na tabela "usuarios" no Supabase pelo email/login + senha
      const cloudRes = await loginUsuarioSupabase(cleanIdentifier, loginPassword);
      if (!cloudRes.success || !cloudRes.data) {
        // Fallback local apenas se não houver usuário na nuvem (ou offline)
        const cloudExists = await getUsuarioSupabase(cleanIdentifier).catch(() => null);
        if (!cloudExists) {
          const localRes = verifyUserLogin(cleanIdentifier, loginPassword);
          if (localRes.success && localRes.user) {
            setLoginSuccessMessage('Acesso autorizado!');
            try { confetti({ particleCount: 50, spread: 60, origin: { y: 0.6 } }); } catch {}
            setTimeout(() => {
              onLoginSuccess(localRes.user!, localRes.driver);
            }, 300);
            return;
          }
        }
        setLoginErrorMessage(cloudRes.error || 'Usuário não encontrado ou senha incorreta no Supabase.');
        return;
      }

      // Sucesso no Supabase
      const row = cloudRes.data;
      const userEmail = (row['e-mail'] || row.email || cleanIdentifier).toLowerCase().trim();
      const rowTipoUpper = String(row.tipo || '').toUpperCase();
      const isCloudAdmin = rowTipoUpper === 'ADM' || rowTipoUpper === 'ADMIN';
      const isMoto = !isCloudAdmin && (row.tipo === 'motoboy' || row.categoria?.includes('moto'));
      const isDriver = !isCloudAdmin && (row.tipo === 'driver' || isMoto || Boolean(row.placa));

      let driverObj: Driver | undefined = undefined;
      if (isDriver) {
        driverObj = {
          id: `drv-${row.id}`,
          name: row.nome,
          email: userEmail,
          phone: row.celular || '',
          avatar: regAvatar || row.avatar || '',
          rating: typeof row.rating === 'number' ? row.rating : 0,
          totalRides: 0,
          vehicleModel: row.modelo || '',
          vehiclePlate: row.placa || '',
          vehicleColor: '',
          vehicleYear: parseInt(row.ano, 10) || 2023,
          cpf: '',
          cnh: row.cnh || '',
          category: (row.categoria as any) || (isMoto ? 'moto_passageiro' : 'economica'),
          weeklyPlanActive: true,
          weeklyPlanPrice: 0,
          status: 'online',
          earningsToday: 0,
          earningsWeek: 0,
          walletBalance: Number(row.saldo || 0),
          cnhVerified: Boolean(row.cnh),
          vehicleVerified: Boolean(row.placa),
          criminalRecordClear: true,
          lat: -23.0842,
          lng: -47.2118,
          registrationDate: row.created_at || new Date().toISOString(),
        };
      }

      const userPayload: AppUser = {
        id: `usr-${row.id}`,
        name: row.nome,
        email: userEmail,
        phone: row.celular || '',
        whatsapp: row.celular || '',
        login: userEmail.split('@')[0],
        role: isCloudAdmin ? 'admin' : isMoto ? 'motoboy' : isDriver ? 'driver' : 'passenger',
        tipo: isCloudAdmin ? 'ADM' : isMoto ? 'motoboy_passageiro' : isDriver ? 'motorista_economico' : 'passenger',
        isAdmin: isCloudAdmin || undefined,
        placa: row.placa || '',
        avatar: regAvatar || row.avatar || undefined,
        rating: typeof row.rating === 'number' ? row.rating : 0,
        driverData: driverObj,
      };

      // Salva sessão local
      saveUserAccount({
        ...userPayload,
        password: row.senha,
        createdAt: row.created_at || new Date().toISOString(),
      }, true);

      setLoginSuccessMessage('Salvo no Supabase! Acesso autorizado.');
      try { confetti({ particleCount: 50, spread: 60, origin: { y: 0.6 } }); } catch {}

      setTimeout(() => {
        onLoginSuccess(userPayload, driverObj);
      }, 400);
    } catch (err: any) {
      setLoginErrorMessage(`Erro no Supabase: ${err?.message || 'Falha de comunicação'}`);
    } finally {
      setIsLoggingIn(false);
    }
  };

  // Submit do Cadastro com 5 campos (Nome, E-mail, WhatsApp, Login, Senha) + FOTO OBRIGATÓRIA
  const handleRegisterSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setRegErrorMessage(null);
    setRegSuccessMessage(null);

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
      // 1. Verifica duplicidade rápida no Supabase
      const cloudEmail = await getUsuarioSupabase(cleanEmail).catch(() => null);
      if (cloudEmail) {
        setRegErrorMessage('Já existe uma conta no sistema com este e-mail. Faça login para continuar.');
        return;
      }

      const isPassengerRole = regRole === 'passenger';
      const isDriverRole = regRole === 'driver';
      const isMotoboyRole = regRole === 'motoboy';
      const chosenAvatar = regAvatar;

      // Criação dos dados do condutor caso seja motorista/motoboy
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
          rating: 0,
          totalRides: 0,
          vehicleModel: '',
          vehiclePlate: '',
          vehicleColor: '',
          vehicleYear: 2023,
          vehiclePhoto: '',
          cpf: '',
          cnh: '',
          category,
          weeklyPlanActive: true,
          weeklyPlanPrice: 0,
          weeklyPlanExpiresAt: null,
          weeklyFeeExpiresAt: null,
          status: 'online',
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

      // 1. FAZER INSERT DIRETO NA TABELA "usuarios" NO SUPABASE COM nome, email, celular, senha, tipo
      const supabaseRes = await insertUsuarioSupabase({
        id: isPassengerRole ? `psg-${Date.now().toString().slice(-6)}` : newDriverObj!.id,
        nome: cleanName,
        email: cleanEmail,
        celular: cleanWhatsApp,
        senha: regPassword,
        tipo: isPassengerRole ? 'passenger' : isMotoboyRole ? 'motoboy' : 'driver',
        categoria: newDriverObj?.category,
        placa: newDriverObj?.vehiclePlate,
        modelo: newDriverObj?.vehicleModel,
        ano: newDriverObj?.vehicleYear,
        cnh: newDriverObj?.cnh,
        avatar: chosenAvatar || undefined,
        status: 'online',
        plano_ativo: true,
      });

      if (!supabaseRes.success) {
        setRegErrorMessage(`Erro ao salvar no Supabase: ${supabaseRes.error || 'Falha no banco de dados'}`);
        return;
      }

      // Alerta de sucesso: Salvo no Supabase
      setRegSuccessMessage('Salvo no Supabase');

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

      setTimeout(() => {
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
      }, 700);
    } catch (err: any) {
      setRegErrorMessage(`Erro ao salvar no Supabase: ${err?.message || 'Verifique sua conexão e tente novamente.'}`);
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
                      Carro próprio &bull; 85% para você &bull; Sem mensalidade
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
                      Moto táxi ou entregas &bull; 85% para você &bull; Sem mensalidade
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

              {/* Botão Esqueci a senha abaixo de ENTRAR COM LOGIN E SENHA */}
              <div className="pt-0.5 flex justify-center">
                <button
                  type="button"
                  onClick={() => setIsForgotPasswordOpen(true)}
                  className="px-4 py-1.5 text-xs font-bold text-zinc-300 hover:text-[#ff6a00] underline underline-offset-4 transition-colors cursor-pointer"
                >
                  Esqueci a senha
                </button>
              </div>

              {/* Botão ADM exatamente abaixo de ENTRAR COM LOGIN E SENHA: pequeno, discreto, cinza claro, centralizado, sempre visível */}
              <div className="pt-0.5 flex justify-center">
                <button
                  type="button"
                  onClick={() => {
                    setLoginErrorMessage(null);
                    setLoginSuccessMessage(null);
                    setLoginIdentifier('');
                    setLoginPassword('');
                    setViewMode('admin_login');
                  }}
                  className="px-4 py-1.5 rounded-lg text-xs font-mono font-bold text-zinc-400 hover:text-zinc-200 transition-colors cursor-pointer tracking-widest uppercase"
                >
                  ADM
                </button>
              </div>
            </div>
          </div>
        )}

        {/* 1B. TELA DE LOGIN DO ADMINISTRADOR (RESTRITO A admin@race.com.br) */}
        {viewMode === 'admin_login' && (
          <div className="space-y-6">
            <div className="flex items-center justify-between border-b border-zinc-800 pb-3">
              <button
                type="button"
                onClick={() => {
                  setLoginErrorMessage(null);
                  setLoginSuccessMessage(null);
                  setViewMode('selection');
                }}
                className="text-zinc-400 hover:text-white text-xs font-bold transition-all cursor-pointer flex items-center gap-1.5"
              >
                <ArrowLeft className="w-4 h-4" />
                <span>Voltar</span>
              </button>
              <span className="text-[11px] font-mono font-bold text-zinc-400 uppercase flex items-center gap-1.5">
                <ShieldCheck className="w-3.5 h-3.5 text-[#ff6a00]" />
                <span>ADM • Acesso Restrito</span>
              </span>
            </div>

            {loginErrorMessage && (
              <div className="bg-red-950/80 border border-red-500/80 text-red-200 text-xs sm:text-sm p-3.5 rounded-2xl font-bold flex items-center gap-2.5 shadow-sm">
                <AlertTriangle className="w-4 h-4 text-red-400 shrink-0" />
                <span>{loginErrorMessage}</span>
              </div>
            )}

            {loginSuccessMessage && (
              <div className="bg-emerald-950/80 border border-emerald-500 text-emerald-200 text-xs sm:text-sm p-3.5 rounded-2xl font-medium flex items-center gap-2.5 shadow-sm animate-pulse">
                <CheckCircle2 className="w-4 h-4 text-emerald-400 shrink-0" />
                <span>{loginSuccessMessage}</span>
              </div>
            )}

            <form onSubmit={handleLoginSubmit} className="space-y-4">
              <div className="space-y-1.5">
                <label className="text-zinc-300 text-xs font-bold uppercase tracking-wider block">
                  E-MAIL DO ADMINISTRADOR
                </label>
                <input
                  type="email"
                  required
                  value={loginIdentifier}
                  onChange={(e) => setLoginIdentifier(e.target.value)}
                  placeholder="admin@race.com.br"
                  className="w-full bg-[#121212] border border-[#2a2a2a] text-white placeholder-zinc-500 rounded-2xl px-4 py-3.5 text-base focus:outline-none focus:border-[#ff6a00] transition-colors font-medium"
                />
              </div>

              <div className="space-y-1.5">
                <label className="text-zinc-300 text-xs font-bold uppercase tracking-wider block">
                  SENHA ADM
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
                className="w-full bg-[#ff6a00] hover:bg-[#e05e00] disabled:opacity-60 active:scale-[0.99] text-white font-heading font-black text-base py-4 px-6 rounded-2xl transition-all cursor-pointer shadow-lg shadow-[#ff6a00]/25 uppercase tracking-wider block mt-5"
              >
                {isLoggingIn ? 'VALIDANDO...' : 'ENTRAR NO ADM'}
              </button>

              <div className="pt-1 text-center">
                <button
                  type="button"
                  onClick={() => {
                    if (!loginIdentifier.trim()) {
                      setLoginIdentifier('admin@race.com.br');
                    }
                    setIsForgotPasswordOpen(true);
                  }}
                  className="px-4 py-1.5 text-xs font-bold text-zinc-300 hover:text-[#ff6a00] underline underline-offset-4 transition-colors cursor-pointer"
                >
                  Esqueci a senha
                </button>
              </div>

              <div className="pt-2 border-t border-zinc-800 text-center">
                <button
                  type="button"
                  onClick={() => handleOpenAdminRegister(loginIdentifier)}
                  className="w-full py-3.5 px-4 rounded-2xl bg-[#161616] hover:bg-[#202020] border border-emerald-500/50 hover:border-emerald-400 text-emerald-400 font-heading font-black text-xs sm:text-sm uppercase tracking-wider transition-all cursor-pointer"
                >
                  CRIAR CONTA DE ADM - PRIMEIRA VEZ
                </button>
              </div>
            </form>
          </div>
        )}

        {/* 1C. TELA DE CADASTRO DO ADM - PRIMEIRA VEZ (Salva em public.usuarios com tipo = ADM) */}
        {viewMode === 'admin_register' && (
          <div className="space-y-5">
            <div className="flex items-center justify-between border-b border-zinc-800 pb-3">
              <button
                type="button"
                onClick={() => {
                  setAdminRegErrorMessage(null);
                  setAdminRegSuccessMessage(null);
                  setViewMode('admin_login');
                }}
                className="text-zinc-400 hover:text-white text-xs font-bold transition-all cursor-pointer flex items-center gap-1.5"
              >
                <ArrowLeft className="w-4 h-4" />
                <span>Voltar para Login ADM</span>
              </button>
              <span className="text-[11px] font-mono font-bold text-emerald-400 uppercase flex items-center gap-1.5">
                <ShieldCheck className="w-3.5 h-3.5" />
                <span>ADM • Primeira Vez</span>
              </span>
            </div>

            <div className="space-y-1">
              <h2 className="text-xl sm:text-2xl font-heading font-black text-white tracking-tight uppercase">
                Criar Conta de ADM
              </h2>
              <p className="text-xs text-zinc-400 font-medium">
                Cadastre o administrador principal do RACE na nuvem Supabase.
              </p>
            </div>

            {adminRegErrorMessage && (
              <div className="bg-red-950/80 border border-red-500/80 text-red-200 text-xs sm:text-sm p-3.5 rounded-2xl font-bold flex items-center gap-2.5 shadow-sm">
                <AlertTriangle className="w-4 h-4 text-red-400 shrink-0" />
                <span>{adminRegErrorMessage}</span>
              </div>
            )}

            {adminRegSuccessMessage && (
              <div className="bg-emerald-950/80 border border-emerald-500 text-emerald-200 text-xs sm:text-sm p-3.5 rounded-2xl font-medium flex items-center gap-2.5 shadow-sm animate-pulse">
                <CheckCircle2 className="w-4 h-4 text-emerald-400 shrink-0" />
                <span>{adminRegSuccessMessage}</span>
              </div>
            )}

            <form onSubmit={handleCreateAdminSubmit} className="space-y-3.5">
              <div className="space-y-1">
                <label className="text-zinc-300 text-xs font-bold uppercase tracking-wider block">
                  Nome *
                </label>
                <input
                  type="text"
                  required
                  value={adminRegName}
                  onChange={(e) => setAdminRegName(e.target.value)}
                  placeholder="Ex: Dinho Administrador"
                  className="w-full bg-[#121212] border border-[#2a2a2a] text-white placeholder-zinc-500 rounded-2xl px-4 py-3 text-sm sm:text-base focus:outline-none focus:border-emerald-500 transition-colors font-medium"
                />
              </div>

              <div className="space-y-1">
                <label className="text-zinc-300 text-xs font-bold uppercase tracking-wider block">
                  E-mail *
                </label>
                <input
                  type="email"
                  required
                  value={adminRegEmail}
                  onChange={(e) => setAdminRegEmail(e.target.value)}
                  placeholder="admin@race.com.br"
                  className="w-full bg-[#121212] border border-[#2a2a2a] text-white placeholder-zinc-500 rounded-2xl px-4 py-3 text-sm sm:text-base focus:outline-none focus:border-emerald-500 transition-colors font-medium"
                />
              </div>

              <div className="space-y-1">
                <label className="text-zinc-300 text-xs font-bold uppercase tracking-wider block">
                  WhatsApp *
                </label>
                <input
                  type="tel"
                  required
                  value={adminRegWhatsApp}
                  onChange={(e) => setAdminRegWhatsApp(e.target.value)}
                  placeholder="(19) 99999-9999"
                  className="w-full bg-[#121212] border border-[#2a2a2a] text-white placeholder-zinc-500 rounded-2xl px-4 py-3 text-sm sm:text-base focus:outline-none focus:border-emerald-500 transition-colors font-medium"
                />
              </div>

              <div className="space-y-1">
                <label className="text-zinc-300 text-xs font-bold uppercase tracking-wider block">
                  Senha (mínimo 6 caracteres) *
                </label>
                <div className="relative">
                  <input
                    type={showAdminRegPassword ? 'text' : 'password'}
                    required
                    value={adminRegPassword}
                    onChange={(e) => setAdminRegPassword(e.target.value)}
                    placeholder="••••••••"
                    className="w-full bg-[#121212] border border-[#2a2a2a] text-white placeholder-zinc-500 rounded-2xl px-4 py-3 text-sm sm:text-base focus:outline-none focus:border-emerald-500 transition-colors pr-12 font-medium"
                  />
                  <button
                    type="button"
                    onClick={() => setShowAdminRegPassword(!showAdminRegPassword)}
                    className="absolute right-4 top-3 text-zinc-400 hover:text-white transition-colors cursor-pointer"
                  >
                    {showAdminRegPassword ? <EyeOff className="w-5 h-5" /> : <Eye className="w-5 h-5" />}
                  </button>
                </div>
              </div>

              <div className="space-y-1">
                <label className="text-zinc-300 text-xs font-bold uppercase tracking-wider block">
                  Confirmar Senha *
                </label>
                <div className="relative">
                  <input
                    type={showAdminRegConfirmPassword ? 'text' : 'password'}
                    required
                    value={adminRegConfirmPassword}
                    onChange={(e) => setAdminRegConfirmPassword(e.target.value)}
                    placeholder="Repita a senha"
                    className="w-full bg-[#121212] border border-[#2a2a2a] text-white placeholder-zinc-500 rounded-2xl px-4 py-3 text-sm sm:text-base focus:outline-none focus:border-emerald-500 transition-colors pr-12 font-medium"
                  />
                  <button
                    type="button"
                    onClick={() => setShowAdminRegConfirmPassword(!showAdminRegConfirmPassword)}
                    className="absolute right-4 top-3 text-zinc-400 hover:text-white transition-colors cursor-pointer"
                  >
                    {showAdminRegConfirmPassword ? <EyeOff className="w-5 h-5" /> : <Eye className="w-5 h-5" />}
                  </button>
                </div>
              </div>

              <button
                type="submit"
                disabled={isCreatingAdmin}
                className="w-full bg-emerald-600 hover:bg-emerald-500 disabled:opacity-60 active:scale-[0.99] text-white font-heading font-black text-base py-4 px-6 rounded-2xl transition-all cursor-pointer shadow-lg shadow-emerald-600/25 uppercase tracking-wider flex items-center justify-center gap-2 mt-4"
              >
                <ShieldCheck className="w-5 h-5" />
                <span>{isCreatingAdmin ? 'CRIANDO CONTA DE ADM...' : 'CRIAR CONTA DE ADM'}</span>
              </button>
            </form>
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

            {loginSuccessMessage && (
              <div className="bg-emerald-950/80 border border-emerald-500 text-emerald-200 text-xs sm:text-sm p-3.5 rounded-2xl font-medium flex items-center gap-2.5 shadow-sm animate-pulse">
                <CheckCircle2 className="w-4 h-4 text-emerald-400 shrink-0" />
                <span>{loginSuccessMessage}</span>
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

              <div className="pt-1 text-center">
                <button
                  type="button"
                  onClick={() => setIsForgotPasswordOpen(true)}
                  className="px-4 py-1.5 text-xs font-bold text-zinc-300 hover:text-[#ff6a00] underline underline-offset-4 transition-colors cursor-pointer"
                >
                  Esqueci a senha
                </button>
              </div>
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
                {regRole === 'driver' && 'Preencha os 5 campos para liberar sua conta (85% para você, 15% Race - sem mensalidade):'}
                {regRole === 'motoboy' && 'Preencha os 5 campos para rodar como motoboy em passageiro ou entregas:'}
              </p>
            </div>

            {regErrorMessage && (
              <div className="bg-red-950/80 border border-red-500/80 text-red-200 text-xs sm:text-sm p-3.5 rounded-2xl font-medium flex items-center gap-2.5 shadow-sm">
                <AlertTriangle className="w-4 h-4 text-red-400 shrink-0" />
                <span>{regErrorMessage}</span>
              </div>
            )}

            {regSuccessMessage && (
              <div className="bg-emerald-950/80 border border-emerald-500 text-emerald-200 text-xs sm:text-sm p-3.5 rounded-2xl font-medium flex items-center gap-2.5 shadow-sm animate-pulse">
                <CheckCircle2 className="w-4 h-4 text-emerald-400 shrink-0" />
                <span>{regSuccessMessage}</span>
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

              {/* Aviso do Modelo de Repasse para Motorista/Motoboy */}
              {(regRole === 'driver' || regRole === 'motoboy') && (
                <div className="p-3.5 bg-emerald-950/40 border border-emerald-500/50 rounded-2xl text-xs text-emerald-200 space-y-1">
                  <div className="flex items-center gap-1.5 font-bold text-emerald-400">
                    <ShieldCheck className="w-4 h-4" />
                    <span>85% para Você • 15% Race</span>
                  </div>
                  <p className="text-[11px] text-zinc-300 font-medium">
                    Você fica com 85% de cada corrida, Race fica com 15% - sem mensalidade, sem taxa para trabalhar.
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

      {/* Modal Esqueci a senha (3 passos: E-mail -> Código 4 números -> Nova senha) */}
      <ForgotPasswordModal
        isOpen={isForgotPasswordOpen}
        onClose={() => setIsForgotPasswordOpen(false)}
        initialIdentifier={
          viewMode === 'admin_login'
            ? loginIdentifier || 'admin@race.com.br'
            : loginIdentifier
        }
        onCreateAccountNow={(unregisteredIdentifier) => {
          handleOpenAdminRegister(unregisteredIdentifier);
        }}
        onPasswordResetSuccess={(resolvedIdentifier, successMessage) => {
          setLoginErrorMessage(null);
          setLoginIdentifier(resolvedIdentifier);
          setLoginPassword('');
          setLoginSuccessMessage(successMessage);
          setViewMode(
            viewMode === 'admin_login' || resolvedIdentifier === 'admin@race.com.br'
              ? 'admin_login'
              : 'login'
          );
        }}
      />
    </div>
  );
};
