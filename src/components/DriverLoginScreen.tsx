import React, { useState, useRef } from 'react';
import { Driver, AppUser } from '../types';
import { Eye, EyeOff, AlertTriangle, ArrowLeft, Car, Bike, User, CheckCircle2, ShieldCheck, Camera, Gift, Download } from 'lucide-react';
import confetti from 'canvas-confetti';
import {
  saveSessionUser,
  mapSupabaseRowToAppUser,
  isAdminTipoValue,
  isAppUserAdmin,
} from '../services/userService';
import {
  insertUsuarioSupabase,
  loginUsuarioSupabase,
  getUsuarioSupabase,
  checkEmailExistsSupabase,
  checkDuplicateRegistrationSupabase,
  fetchDriverApplicationsSupabase,
  mergeDriverWithApplication,
  extractPhotoFromRow,
  withPhotoCacheBuster,
  generateUniqueReferralCodeSupabase,
  ensureUserReferralCodeSupabase,
  validateReferralCodeExistsSupabase,
  normalizeReferralCodeInput,
  INVALID_REFERRAL_CODE_ERROR,
  isPrimaryAdmEmail,
} from '../supabase';
import { compressImageToMax200KB } from '../utils/imageCompression';
import { isValidEmail, isValidWhatsApp11, isValidPassword } from '../utils/security';
import { ForgotPasswordModal } from './ForgotPasswordModal';
import { LaunchPromoBanner } from './LaunchPromoBanner';
import { DriverBenefitsBox } from './DriverBenefitsBox';
import { getReferralCodeFromUrl, normalizeReferralDigits } from '../services/promoService';
import { getRaceCircleIconUrl } from '../utils/brandAssets';
import { LegalDocumentModal, FullLegalDocType } from './LegalDocumentModal';

interface DriverLoginScreenProps {
  drivers: Driver[];
  passengers?: AppUser[];
  onLoginSuccess: (user: AppUser, driver?: Driver) => void;
  onRegisterDriverSuccess: (user: AppUser, newDriver: Driver) => void;
  onRegisterMotoboySuccess?: (user: AppUser, newMotoboy: Driver) => void;
  onRegisterPassengerSuccess: (user: AppUser) => void;
  onOpenPrivacyPage?: () => void;
}

type RegistrationRole = 'passenger' | 'driver' | 'motoboy';

export const DriverLoginScreen: React.FC<DriverLoginScreenProps> = ({
  drivers,
  passengers = [],
  onLoginSuccess,
  onRegisterDriverSuccess,
  onRegisterMotoboySuccess,
  onRegisterPassengerSuccess,
  onOpenPrivacyPage,
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
  const [regIndicadoPor, setRegIndicadoPor] = useState<string>(() => getReferralCodeFromUrl());
  const [regIndicadoPorError, setRegIndicadoPorError] = useState<string | null>(null);
  const [showRegPassword, setShowRegPassword] = useState(false);
  const [regErrorMessage, setRegErrorMessage] = useState<string | null>(null);
  const [regSuccessMessage, setRegSuccessMessage] = useState<string | null>(null);
  const [isRegistering, setIsRegistering] = useState(false);
  const [acceptedLegalTerms, setAcceptedLegalTerms] = useState(false);
  const [openLegalDoc, setOpenLegalDoc] = useState<FullLegalDocType | null>(null);

  // Foto de perfil do cadastro (Galeria do Celular ou Câmera)
  const [regAvatar, setRegAvatar] = useState<string | null>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const indicadoPorInputRef = useRef<HTMLInputElement>(null);

  const handlePhotoSelect = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    try {
      const compressedBase64 = await compressImageToMax200KB(file);
      if (compressedBase64) {
        setRegAvatar(compressedBase64);
      }
    } catch (error: any) {
      console.log('Erro ao processar foto:', error);
      setRegErrorMessage(`Erro ao processar foto: ${error?.message || String(error)}`);
    }
  };

  // Iniciar fluxo de cadastro para a categoria escolhida
  const handleStartRegister = (role: RegistrationRole) => {
    setRegRole(role);
    setRegErrorMessage(null);
    setRegIndicadoPorError(null);
    setRegSuccessMessage(null);
    setAcceptedLegalTerms(false);
    const urlCode = getReferralCodeFromUrl();
    if (urlCode && !regIndicadoPor.trim()) {
      setRegIndicadoPor(urlCode);
    }
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
    const cleanEmail = adminRegEmail.replace(/\s+/g, '').trim().toLowerCase();
    const cleanWhatsApp = adminRegWhatsApp.replace(/\D/g, '').trim();

    if (!cleanName || !cleanEmail || !cleanWhatsApp || !adminRegPassword || !adminRegConfirmPassword) {
      setAdminRegErrorMessage('Por favor, preencha todos os campos obrigatórios.');
      return;
    }

    if (!isValidEmail(cleanEmail)) {
      setAdminRegErrorMessage('E-mail inválido. Informe um e-mail válido (ex: nome@dominio.com).');
      return;
    }

    if (!isValidWhatsApp11(cleanWhatsApp)) {
      setAdminRegErrorMessage('WhatsApp inválido! Informe exatamente 11 dígitos com DDD e o 9 (ex: 19999999999).');
      return;
    }

    if (!isValidPassword(adminRegPassword)) {
      setAdminRegErrorMessage('A senha do ADM deve conter no mínimo 6 caracteres.');
      return;
    }

    if (adminRegPassword !== adminRegConfirmPassword) {
      setAdminRegErrorMessage('As senhas não conferem');
      return;
    }

    setIsCreatingAdmin(true);
    try {
      // Verifica se já existe conta com este e-mail ou WhatsApp no Supabase
      const dupCheck = await checkDuplicateRegistrationSupabase({
        email: cleanEmail,
        whatsapp: cleanWhatsApp,
      });
      if (dupCheck.isDuplicate && dupCheck.message) {
        setAdminRegErrorMessage(dupCheck.message);
        return;
      }

      // Salva no Supabase Auth + public.usuarios com tipo = 'admin' e foto/avatar inicializados
      const supabaseRes = await insertUsuarioSupabase({
        nome: cleanName,
        email: cleanEmail,
        celular: cleanWhatsApp,
        whatsapp: cleanWhatsApp,
        login: cleanEmail,
        senha: adminRegPassword,
        tipo: 'admin',
        foto: '',
        avatar: '',
      });

      if (!supabaseRes.success) {
        console.log('Erro Supabase ADM:', supabaseRes.error);
        const safeErr = String(supabaseRes.error || 'Falha ao salvar no banco de dados');
        const isFriendlyDup =
          safeErr.includes('já está cadastrado') || safeErr.includes('já está em uso');
        setAdminRegErrorMessage(
          isFriendlyDup
            ? safeErr
            : safeErr.includes('42703') || safeErr.toLowerCase().includes('does not exist')
            ? 'Não foi possível concluir o cadastro ADM com as colunas atuais do banco.'
            : `Erro Supabase: ${safeErr}`
        );
        return;
      }

      const createdRow = supabaseRes.data;
      const supabaseId = createdRow?.id !== undefined && createdRow?.id !== null ? String(createdRow.id) : '';
      const adminUser: AppUser = {
        id: supabaseId,
        name: cleanName,
        email: cleanEmail,
        phone: cleanWhatsApp,
        whatsapp: cleanWhatsApp,
        login: cleanEmail,
        role: 'admin',
        tipo: 'admin',
        isAdmin: true,
        placa: 'ADMIN-01',
        rating: 0,
      };

      saveSessionUser(adminUser);

      setAdminRegSuccessMessage('Conta de ADM criada e salva no Supabase com sucesso!');
      try { confetti({ particleCount: 70, spread: 75, origin: { y: 0.6 } }); } catch {}

      setTimeout(() => {
        onLoginSuccess(adminUser);
      }, 600);
    } catch (error: any) {
      console.log(error);
      setAdminRegErrorMessage(`Erro Supabase: ${error?.message || String(error)}`);
    } finally {
      setIsCreatingAdmin(false);
    }
  };

  // Submit de Login - Busca o usuário diretamente na tabela "usuarios" no Supabase pelo email + senha
  const handleLoginSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoginErrorMessage(null);
    setLoginSuccessMessage(null);

    const cleanIdentifier = loginIdentifier.replace(/\s+/g, '').trim().toLowerCase();
    if (!cleanIdentifier || !loginPassword) {
      setLoginErrorMessage('Por favor, informe seu E-mail ou Login e sua senha.');
      return;
    }

    setIsLoggingIn(true);
    try {
      // FLUXO DEDICADO DA TELA ADM (autentica via Supabase Auth e valida tipo = admin/adm/administrador)
      if (viewMode === 'admin_login') {
        const cloudAdminRes = await loginUsuarioSupabase(cleanIdentifier, loginPassword);
        if (cloudAdminRes.success && cloudAdminRes.data) {
          const row = cloudAdminRes.data;
          const rowEmail = (row['e-mail'] || row.email || cleanIdentifier).toLowerCase().trim();
          const isRowAdmin =
            isAdminTipoValue(row.tipo) || isPrimaryAdmEmail(rowEmail) || rowEmail === 'admin@race.com.br';

          if (!isRowAdmin) {
            setLoginErrorMessage('Acesso restrito');
            return;
          }

          const resolvedAdminAvatar = withPhotoCacheBuster(extractPhotoFromRow(row));
          const ensuredAdminCode = await ensureUserReferralCodeSupabase({
            id: row?.id !== undefined && row?.id !== null ? String(row.id) : '',
            email: rowEmail,
            name: row.nome || 'Administrador Geral',
            currentCode: row.codigo_indicacao,
          });
          const adminUser: AppUser = {
            id: row?.id !== undefined && row?.id !== null ? String(row.id) : '',
            name: row.nome || 'Administrador Geral',
            email: rowEmail,
            phone: row.celular || '',
            whatsapp: row.whatsapp || row.celular || '',
            login: row.login || rowEmail,
            role: 'admin',
            tipo: 'ADM',
            isAdmin: true,
            placa: '',
            avatar: resolvedAdminAvatar || undefined,
            rating: 0,
            codigoIndicacao: ensuredAdminCode,
            driverData: undefined,
          };

          saveSessionUser(adminUser);

          setLoginSuccessMessage('Acesso ADM liberado!');
          try { confetti({ particleCount: 50, spread: 60, origin: { y: 0.6 } }); } catch {}
          setTimeout(() => {
            onLoginSuccess(adminUser);
          }, 300);
          return;
        }

        // Verifica se o usuário existe mas não tem perfil ADM -> exibe "Acesso restrito"
        const existingUser = await getUsuarioSupabase(cleanIdentifier).catch(() => null);
        if (existingUser) {
          const existingEmail = (existingUser['e-mail'] || existingUser.email || '').toLowerCase().trim();
          if (
            !isAdminTipoValue(existingUser.tipo) &&
            !isPrimaryAdmEmail(existingEmail) &&
            existingEmail !== 'admin@race.com.br'
          ) {
            setLoginErrorMessage('Acesso restrito');
            return;
          }
        }

        setLoginErrorMessage(cloudAdminRes.error || 'E-mail ou senha incorretos.');
        return;
      }

      // 0. Conta Mestre de Administrador (quando entra pelo login geral com admin@race.com.br)
      if (cleanIdentifier === 'admin@race.com.br') {
        const cloudAdmin = await loginUsuarioSupabase(cleanIdentifier, loginPassword);
        if (cloudAdmin.success && cloudAdmin.data) {
          const row = cloudAdmin.data;
          const resolvedAdminAvatar = withPhotoCacheBuster(extractPhotoFromRow(row));
          const ensuredAdminCode = await ensureUserReferralCodeSupabase({
            id: row?.id !== undefined && row?.id !== null ? String(row.id) : '',
            email: 'admin@race.com.br',
            name: row.nome || 'Administrador Geral',
            currentCode: row.codigo_indicacao,
          });
          const adminUser: AppUser = {
            id: row?.id !== undefined && row?.id !== null ? String(row.id) : '',
            name: row.nome || 'Administrador Geral',
            email: 'admin@race.com.br',
            phone: row.celular || '',
            whatsapp: row.whatsapp || row.celular || '',
            login: row.login || 'admin@race.com.br',
            role: 'admin',
            tipo: 'ADM',
            isAdmin: true,
            placa: '',
            avatar: resolvedAdminAvatar || undefined,
            rating: 0,
            codigoIndicacao: ensuredAdminCode,
            driverData: undefined,
          };
          saveSessionUser(adminUser);
          setLoginSuccessMessage('Acesso ADM liberado!');
          try { confetti({ particleCount: 50, spread: 60, origin: { y: 0.6 } }); } catch {}
          setTimeout(() => {
            onLoginSuccess(adminUser);
          }, 300);
          return;
        }

        setLoginErrorMessage(cloudAdmin.error || 'Credenciais inválidas para o Administrador.');
        return;
      }

      // 1. Login via Supabase Auth (signInWithPassword) + leitura de tipo em public.usuarios
      const cloudRes = await loginUsuarioSupabase(cleanIdentifier, loginPassword);
      if (!cloudRes.success || !cloudRes.data) {
        const cloudExists = await checkEmailExistsSupabase(cleanIdentifier).catch(() => false);
        if (!cloudExists) {
          setLoginErrorMessage('E-mail não encontrado, faça cadastro');
          return;
        }
        setLoginErrorMessage(cloudRes.error || 'Senha incorreta. Tente novamente ou clique em Esqueci minha senha.');
        return;
      }

      // Sucesso no Supabase
      const row = cloudRes.data;
      const { user: mappedUser, driver: mappedDriver } = mapSupabaseRowToAppUser(row);
      const resolvedPhoto = mappedUser.avatar
        ? withPhotoCacheBuster(mappedUser.avatar)
        : mappedDriver?.avatar
        ? withPhotoCacheBuster(mappedDriver.avatar)
        : '';
      const ensuredCodigoIndicacao = await ensureUserReferralCodeSupabase({
        id: mappedUser.id,
        email: mappedUser.email,
        name: mappedUser.name,
        currentCode: mappedUser.codigoIndicacao || row.codigo_indicacao,
      });

      // TRAVA ABSOLUTA DE ADM: se tipo = ADM ou euroclub507@gmail.com, sempre abrir Painel do ADM
      if (isAppUserAdmin(mappedUser)) {
        const cleanAdminUser: AppUser = {
          ...mappedUser,
          role: 'admin',
          tipo: 'ADM',
          isAdmin: true,
          placa: '',
          avatar: resolvedPhoto || undefined,
          codigoIndicacao: ensuredCodigoIndicacao,
          driverData: undefined,
        };
        saveSessionUser(cleanAdminUser);
        setLoginSuccessMessage('Acesso ADM liberado!');
        try { confetti({ particleCount: 50, spread: 60, origin: { y: 0.6 } }); } catch {}
        setTimeout(() => {
          onLoginSuccess(cleanAdminUser, undefined);
        }, 400);
        return;
      }

      let driverObj: Driver | undefined = mappedDriver
        ? {
            ...mappedDriver,
            avatar: resolvedPhoto || mappedDriver.avatar || '',
            codigoIndicacao: ensuredCodigoIndicacao,
          }
        : undefined;
      if (driverObj && driverObj.email) {
        try {
          const appsMap = await fetchDriverApplicationsSupabase(driverObj.email);
          const appRec = appsMap[driverObj.email.toLowerCase()];
          if (appRec) {
            driverObj = mergeDriverWithApplication(driverObj, appRec);
          }
        } catch {}
      }
      const userPayload: AppUser = {
        ...mappedUser,
        avatar: resolvedPhoto || driverObj?.avatar || undefined,
        codigoIndicacao: ensuredCodigoIndicacao,
        driverData: driverObj,
      };
      saveSessionUser(userPayload);

      setLoginSuccessMessage('Acesso autorizado!');
      try { confetti({ particleCount: 50, spread: 60, origin: { y: 0.6 } }); } catch {}

      setTimeout(() => {
        onLoginSuccess(userPayload, driverObj);
      }, 400);
    } catch (error: any) {
      console.log(error);
      setLoginErrorMessage(`Erro Supabase: ${error?.message || String(error)}`);
    } finally {
      setIsLoggingIn(false);
    }
  };

  // Submit do Cadastro com 5 campos (Nome, E-mail, WhatsApp, Login, Senha) + FOTO OBRIGATÓRIA
  const handleRegisterSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setRegErrorMessage(null);
    setRegIndicadoPorError(null);
    setRegSuccessMessage(null);

    // 1. Foto Obrigatória para TODAS as opções: Motorista, Motoboy, Passageiro
    if (!regAvatar) {
      setRegErrorMessage('Adicione sua foto para continuar');
      return;
    }

    // 2. Aceite obrigatório dos Termos de Uso e Política de Privacidade (LGPD)
    if (!acceptedLegalTerms) {
      setRegErrorMessage('Você precisa aceitar os Termos para continuar');
      return;
    }

    const isPassengerRole = regRole === 'passenger';
    const cleanName = regName.trim();
    const cleanEmail = regEmail.replace(/\s+/g, '').trim().toLowerCase();
    const cleanWhatsApp = regWhatsApp.replace(/\D/g, '').trim();
    const rawCleanLogin = regLogin.replace(/\s+/g, '').trim().toLowerCase();
    const cleanLogin = rawCleanLogin || (isPassengerRole ? cleanEmail : '');

    if (!cleanName || !cleanEmail || !cleanWhatsApp || (!isPassengerRole && !cleanLogin) || !regPassword) {
      setRegErrorMessage(
        isPassengerRole
          ? 'Por favor, preencha Nome, E-mail, WhatsApp e Senha.'
          : 'Por favor, preencha todos os 5 campos obrigatórios (*).'
      );
      return;
    }

    if (!isValidEmail(cleanEmail)) {
      setRegErrorMessage('E-mail inválido. Digite um e-mail válido com @ e .com (ex: seu.nome@gmail.com).');
      return;
    }

    if (!isValidWhatsApp11(cleanWhatsApp)) {
      setRegErrorMessage('WhatsApp inválido! Digite exatamente 11 dígitos com DDD + 9 (ex: 19999999999).');
      return;
    }

    if (!isValidPassword(regPassword)) {
      setRegErrorMessage('A senha deve conter no mínimo 6 dígitos para sua segurança.');
      return;
    }

    if (regPassword !== regConfirmPassword) {
      setRegErrorMessage('A confirmação de senha não confere com a senha digitada.');
      return;
    }

    setIsRegistering(true);
    try {
      // 1. Verifica duplicidade de e-mail e WhatsApp no Supabase ANTES de salvar
      const dupCheck = await checkDuplicateRegistrationSupabase({
        email: cleanEmail,
        whatsapp: cleanWhatsApp,
        login: cleanLogin,
      });
      if (dupCheck.isDuplicate && dupCheck.message) {
        setRegErrorMessage(dupCheck.message);
        return;
      }

      const normalizedReferralInput = normalizeReferralCodeInput(regIndicadoPor);
      if (normalizedReferralInput !== regIndicadoPor) {
        setRegIndicadoPor(normalizedReferralInput);
      }

      const cleanReferralDigits = normalizeReferralDigits(normalizedReferralInput);
      const cleanWhatsAppDigits = normalizeReferralDigits(cleanWhatsApp);
      if (
        normalizedReferralInput &&
        ((cleanReferralDigits && cleanWhatsAppDigits && cleanReferralDigits === cleanWhatsAppDigits) ||
          normalizedReferralInput.toLowerCase() === cleanEmail)
      ) {
        setRegIndicadoPorError('Você não pode usar o seu próprio WhatsApp ou e-mail como código de indicação.');
        indicadoPorInputRef.current?.scrollIntoView({ behavior: 'smooth', block: 'center' });
        indicadoPorInputRef.current?.focus();
        return;
      }

      let normalizedIndicadoPor = '';
      if (normalizedReferralInput) {
        const referralCheck = await validateReferralCodeExistsSupabase(normalizedReferralInput);
        if (!referralCheck.valid) {
          setRegIndicadoPorError(referralCheck.error || INVALID_REFERRAL_CODE_ERROR);
          indicadoPorInputRef.current?.scrollIntoView({ behavior: 'smooth', block: 'center' });
          indicadoPorInputRef.current?.focus();
          return;
        }
        normalizedIndicadoPor = referralCheck.normalizedCode;
      }

      const isDriverRole = regRole === 'driver';
      const isMotoboyRole = regRole === 'motoboy';
      const chosenAvatar = await compressImageToMax200KB(regAvatar);
      const generatedReferralCode = await generateUniqueReferralCodeSupabase(cleanName);
      const nowIso = new Date().toISOString();

      // Condutor inicia sem documentos aceitos (completará modalidade + documentos + 4 checkboxes dentro do app)
      let newDriverObj: Driver | undefined = undefined;
      if (isDriverRole || isMotoboyRole) {
        newDriverObj = {
          id: '',
          name: cleanName,
          phone: cleanWhatsApp,
          email: cleanEmail,
          avatar: chosenAvatar,
          rating: 0,
          totalRides: 0,
          vehicleModel: '',
          vehiclePlate: '',
          vehicleColor: '',
          vehicleYear: 0,
          vehiclePhoto: '',
          cnhPhoto: '',
          cnhFrontPhoto: '',
          cnhBackPhoto: '',
          crlvPhoto: '',
          approvalStatus: 'pendente',
          cpf: '',
          cnh: '',
          category: isMotoboyRole ? 'moto_passageiro' : 'economica',
          categoryConfigured: false,
          requirementsConfirmed: false,
          documentosAceitos: false,
          weeklyPlanActive: false,
          weeklyPlanPrice: 0,
          weeklyPlanExpiresAt: null,
          weeklyFeeExpiresAt: null,
          status: 'pending_approval',
          earningsToday: 0,
          earningsWeek: 0,
          cnhVerified: false,
          vehicleVerified: false,
          criminalRecordClear: true,
          lat: -23.0842,
          lng: -47.2118,
          registrationDate: nowIso,
          createdAt: nowIso,
          indicadoPor: normalizedIndicadoPor || undefined,
          indicadoPorCodigo: normalizedIndicadoPor || undefined,
          codigoIndicacao: generatedReferralCode,
        };
      }

      // INSERT DIRETO NA TABELA "usuarios" + Supabase Auth com documentos_aceitos = false para condutores
      const supabaseRes = await insertUsuarioSupabase({
        nome: cleanName,
        email: cleanEmail,
        celular: cleanWhatsApp,
        whatsapp: cleanWhatsApp,
        login: cleanLogin,
        senha: regPassword,
        tipo: isPassengerRole ? 'passenger' : isMotoboyRole ? 'motoboy' : 'driver',
        foto: chosenAvatar || '',
        avatar: chosenAvatar || '',
        documentos_aceitos: isPassengerRole ? true : false,
        indicado_por: normalizedIndicadoPor || undefined,
        indicado_por_codigo: normalizedIndicadoPor || undefined,
        codigo_indicacao: generatedReferralCode,
      });

      if (!supabaseRes.success) {
        console.log('Erro Supabase cadastro:', supabaseRes.error);
        const safeErr = String(supabaseRes.error || 'Falha desconhecida ao salvar usuário.');
        const isFriendlyDup =
          safeErr.includes('já está cadastrado') || safeErr.includes('já está em uso');
        setRegErrorMessage(
          isFriendlyDup
            ? safeErr
            : safeErr.includes('42703') || safeErr.toLowerCase().includes('does not exist')
            ? 'Não foi possível concluir o cadastro com as colunas atuais do banco.'
            : `Erro Supabase: ${safeErr}`
        );
        return;
      }

      const supabaseGeneratedId =
        supabaseRes.data?.id !== undefined && supabaseRes.data?.id !== null
          ? String(supabaseRes.data.id)
          : '';
      const resolvedCodigoIndicacao =
        String(supabaseRes.data?.codigo_indicacao || generatedReferralCode).trim().toUpperCase();
      const resolvedIndicadoPor =
        String(supabaseRes.data?.indicado_por || normalizedIndicadoPor || '').trim() || undefined;
      const resolvedIndicadoPorCodigo =
        String(
          supabaseRes.data?.codigo_usado ||
            supabaseRes.data?.indicado_por_codigo ||
            normalizedIndicadoPor ||
            ''
        )
          .trim()
          .toUpperCase() || undefined;

      if (newDriverObj) {
        newDriverObj.id = supabaseGeneratedId;
        newDriverObj.codigoIndicacao = resolvedCodigoIndicacao;
        newDriverObj.indicadoPor = resolvedIndicadoPor;
        newDriverObj.indicadoPorCodigo = resolvedIndicadoPorCodigo;
      }

      // Alerta de sucesso: Salvo no Supabase
      setRegSuccessMessage(
        isPassengerRole
          ? `Salvo no Supabase! Seu código de indicação: ${resolvedCodigoIndicacao}`
          : `Conta criada! Seu código de indicação: ${resolvedCodigoIndicacao}`
      );

      const newUser: AppUser = {
        id: supabaseGeneratedId,
        name: cleanName,
        email: cleanEmail,
        phone: cleanWhatsApp,
        whatsapp: cleanWhatsApp,
        login: cleanLogin,
        role: isPassengerRole ? 'passenger' : isMotoboyRole ? 'motoboy' : 'driver',
        tipo: isPassengerRole ? 'passenger' : isMotoboyRole ? 'motoboy' : 'driver',
        placa: '',
        avatar: chosenAvatar,
        rating: 0,
        createdAt: supabaseRes.data?.created_at || newDriverObj?.createdAt || new Date().toISOString(),
        indicadoPor: resolvedIndicadoPor,
        indicadoPorCodigo: resolvedIndicadoPorCodigo,
        codigoIndicacao: resolvedCodigoIndicacao,
        driverData: newDriverObj,
      };

      saveSessionUser(newUser);

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
    } catch (error: any) {
      console.log(error);
      setRegErrorMessage(`Erro Supabase: ${error?.message || String(error)}`);
    } finally {
      setIsRegistering(false);
    }
  };

  return (
    <div className="h-dvh w-full overflow-y-auto overscroll-contain bg-[#000000] text-white px-4 sm:px-6 py-10 selection:bg-[#ff6a00] selection:text-white">
      <div className="min-h-full flex flex-col justify-center items-center">
      <div className="w-full max-w-sm sm:max-w-md space-y-7 animate-fade-in">
        {/* Topo Oficial RACE */}
        <div className="text-center space-y-2 flex flex-col items-center">
          <img
            src={getRaceCircleIconUrl()}
            alt="RACE"
            className="w-32 h-32 sm:w-36 sm:h-36 rounded-full object-contain drop-shadow-[0_0_24px_rgba(255,20,40,0.4)] select-none"
          />
          <p className="text-zinc-300 font-medium text-sm sm:text-base tracking-wide">
            Mobilidade Urbana & Entregas
          </p>
          <p className="text-[11px] text-zinc-500 font-mono">
            Indaiatuba - SP
          </p>
        </div>

        {/* Banner Lançamento RACE no topo da tela preta */}
        <LaunchPromoBanner />

        {/* Botão direto BAIXAR APK (hospedado no próprio site /Dinho/app-release.apk, sem Drive e sem pedir conta) */}
        {viewMode === 'selection' && (
          <div className="space-y-2">
            <a
              href="https://cruzsousaloja1-cmd.github.io/Dinho/app-release.apk"
              download="app-release.apk"
              className="w-full py-4 px-5 rounded-2xl bg-red-600 hover:bg-red-500 active:scale-[0.98] border-2 border-red-400 text-white font-heading font-black text-base sm:text-lg tracking-wide uppercase flex items-center justify-center gap-2.5 shadow-xl transition-all no-underline cursor-pointer"
            >
              <Download className="w-5 h-5 shrink-0" />
              <span>BAIXAR APK</span>
            </a>
            <p className="text-[11px] text-zinc-400 text-center font-medium">
              Download direto do app RACE para Android &bull; Sem Google Drive
            </p>
          </div>
        )}

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

            <DriverBenefitsBox compact />

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

              {/* 2. Cadastro de Motorista (Quero ser motorista) */}
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
                      Quero ser motorista
                    </h3>
                    <p className="text-xs text-zinc-400 font-medium">
                      85% para você &bull; Sem mensalidade &bull; Aprovação ADM
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

              {adminRegErrorMessage && (
                <div className="bg-red-950/90 border-2 border-red-500 text-red-200 text-xs sm:text-sm p-3.5 rounded-2xl font-bold flex items-start gap-2.5 shadow-md">
                  <AlertTriangle className="w-4 h-4 text-red-400 shrink-0 mt-0.5" />
                  <span>{adminRegErrorMessage}</span>
                </div>
              )}

              <button
                type="submit"
                disabled={isCreatingAdmin}
                className={`w-full font-heading font-black text-base py-4 px-6 rounded-2xl transition-all uppercase tracking-wider flex items-center justify-center gap-2 mt-4 ${
                  !isCreatingAdmin
                    ? 'bg-blue-600 hover:bg-blue-500 active:scale-[0.99] text-white cursor-pointer shadow-lg shadow-blue-600/25'
                    : 'bg-zinc-800 text-zinc-500 cursor-not-allowed border border-zinc-700 opacity-60'
                }`}
              >
                <ShieldCheck className="w-5 h-5" />
                <span>
                  {isCreatingAdmin ? 'CRIANDO CONTA DE ADM...' : 'CRIAR CONTA DE ADM'}
                </span>
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
                  setRegIndicadoPorError(null);
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
                {regRole === 'driver' && 'QUERO SER MOTORISTA'}
                {regRole === 'motoboy' && 'CADASTRO DE MOTOBOY'}
              </h2>
              <p className="text-xs text-zinc-400 font-medium">
                {regRole === 'passenger'
                  ? 'Preencha os 5 campos abaixo para entrar direto na busca de corridas:'
                  : 'Preencha os 5 campos abaixo e adicione sua foto para continuar:'}
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
                  4. Login (Nome de Usuário) {regRole === 'passenger' ? '(Opcional)' : '*'}
                </label>
                <input
                  type="text"
                  required={regRole !== 'passenger'}
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

              <div className={`space-y-1.5 p-3.5 rounded-2xl border ${
                regIndicadoPorError
                  ? 'bg-red-950/30 border-red-500/70'
                  : 'bg-orange-950/30 border-orange-500/40'
              }`}>
                <label className="text-orange-300 text-xs font-bold uppercase tracking-wider flex items-center gap-1.5">
                  <Gift className="w-3.5 h-3.5 text-[#ff6a00] shrink-0" />
                  <span>Código de quem indicou (opcional)</span>
                </label>
                <input
                  ref={indicadoPorInputRef}
                  type="text"
                  value={regIndicadoPor}
                  onChange={(e) => {
                    setRegIndicadoPor(e.target.value);
                    if (regIndicadoPorError) setRegIndicadoPorError(null);
                  }}
                  onBlur={() => {
                    const normalized = normalizeReferralCodeInput(regIndicadoPor);
                    if (normalized !== regIndicadoPor) {
                      setRegIndicadoPor(normalized);
                    }
                  }}
                  placeholder="Ex: JOSE123 ou WhatsApp (19) 99999-9999"
                  className={`w-full bg-[#121212] border text-white placeholder-zinc-500 rounded-2xl px-4 py-3 text-sm focus:outline-none transition-colors font-medium font-mono uppercase ${
                    regIndicadoPorError
                      ? 'border-red-500 focus:border-red-500'
                      : 'border-[#2a2a2a] focus:border-[#ff6a00]'
                  }`}
                />
                {regIndicadoPorError && (
                  <p className="text-xs text-red-400 font-bold flex items-start gap-1.5 pt-0.5" role="alert">
                    <AlertTriangle className="w-3.5 h-3.5 text-red-400 shrink-0 mt-0.5" />
                    <span>{regIndicadoPorError}</span>
                  </p>
                )}
                <p className="text-[11px] text-orange-200/80 font-medium">
                  Se alguém te indicou, informe o código (ex: JOSE123) ou WhatsApp para ele ganhar R$ 50 quando o Motorista OU Motoboy indicado fizer 10 corridas!
                </p>
              </div>

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

              {/* Aceite obrigatório dos Termos de Uso e Política de Privacidade (LGPD) */}
              <div
                className={`p-3.5 rounded-2xl border-2 transition-colors ${
                  acceptedLegalTerms
                    ? 'bg-emerald-950/30 border-emerald-500/60'
                    : regErrorMessage === 'Você precisa aceitar os Termos para continuar'
                    ? 'bg-red-950/40 border-red-500'
                    : 'bg-[#121212] border-zinc-700'
                }`}
              >
                <div className="flex items-start gap-3">
                  <input
                    id="register-accept-terms-checkbox"
                    type="checkbox"
                    checked={acceptedLegalTerms}
                    onChange={(e) => {
                      setAcceptedLegalTerms(e.target.checked);
                      if (
                        e.target.checked &&
                        regErrorMessage === 'Você precisa aceitar os Termos para continuar'
                      ) {
                        setRegErrorMessage(null);
                      }
                    }}
                    className="mt-0.5 w-5 h-5 accent-emerald-500 rounded cursor-pointer shrink-0"
                  />
                  <div className="flex-1 text-xs sm:text-sm text-zinc-200 leading-relaxed font-medium">
                    <label
                      htmlFor="register-accept-terms-checkbox"
                      className="cursor-pointer select-none"
                    >
                      Li e aceito os{' '}
                    </label>
                    <button
                      type="button"
                      onClick={() => setOpenLegalDoc('termos')}
                      className="text-[#ff6a00] hover:text-orange-400 font-black underline underline-offset-2 cursor-pointer"
                    >
                      Termos de Uso
                    </button>
                    <label
                      htmlFor="register-accept-terms-checkbox"
                      className="cursor-pointer select-none"
                    >
                      {' '}e a{' '}
                    </label>
                    <button
                      type="button"
                      onClick={() => setOpenLegalDoc('privacidade')}
                      className="text-[#ff6a00] hover:text-orange-400 font-black underline underline-offset-2 cursor-pointer"
                    >
                      Política de Privacidade (LGPD)
                    </button>
                  </div>
                </div>
              </div>

              {regErrorMessage && (
                <div className="bg-red-950/90 border-2 border-red-500 text-red-200 text-xs sm:text-sm p-3.5 rounded-2xl font-bold space-y-2 shadow-md">
                  <div className="flex items-start gap-2.5">
                    <AlertTriangle className="w-4 h-4 text-red-400 shrink-0 mt-0.5" />
                    <span>{regErrorMessage}</span>
                  </div>
                  {(regErrorMessage.includes('Entrar') || regErrorMessage.includes('Esqueci')) && (
                    <div className="flex items-center gap-2 flex-wrap pl-6">
                      <button
                        type="button"
                        onClick={() => {
                          setLoginIdentifier(regEmail.replace(/\s+/g, '').trim().toLowerCase());
                          setLoginErrorMessage(null);
                          setRegErrorMessage(null);
                          setViewMode('login');
                        }}
                        className="px-3 py-1 rounded-lg bg-[#ff6a00] hover:bg-[#e05e00] text-white text-xs font-heading font-black cursor-pointer"
                      >
                        Entrar agora
                      </button>
                      <button
                        type="button"
                        onClick={() => {
                          setLoginIdentifier(regEmail.replace(/\s+/g, '').trim().toLowerCase());
                          setIsForgotPasswordOpen(true);
                        }}
                        className="px-3 py-1 rounded-lg bg-zinc-800 hover:bg-zinc-700 text-zinc-200 text-xs font-heading font-bold border border-zinc-600 cursor-pointer"
                      >
                        Esqueci minha senha
                      </button>
                    </div>
                  )}
                </div>
              )}

              {(() => {
                const canSaveNow = Boolean(regAvatar) && !isRegistering;
                return (
                  <button
                    type="submit"
                    disabled={!canSaveNow}
                    className={`w-full font-heading font-black text-base sm:text-lg py-4 px-6 rounded-2xl transition-all uppercase tracking-wider block mt-3 ${
                      canSaveNow
                        ? 'bg-blue-600 hover:bg-blue-500 active:scale-[0.99] text-white cursor-pointer shadow-lg shadow-blue-600/25'
                        : 'bg-zinc-800 text-zinc-500 cursor-not-allowed border border-zinc-700 opacity-60'
                    }`}
                  >
                    {isRegistering
                      ? 'CRIANDO CONTA NA NUVEM...'
                      : !regAvatar
                      ? '📸 ADICIONE SUA FOTO PARA CONTINUAR'
                      : 'CADASTRAR E ENTRAR'}
                  </button>
                );
              })()}

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
      <LegalDocumentModal
        doc={openLegalDoc}
        onClose={() => setOpenLegalDoc(null)}
        onAccept={() => {
          setAcceptedLegalTerms(true);
          setOpenLegalDoc(null);
          if (regErrorMessage === 'Você precisa aceitar os Termos para continuar') {
            setRegErrorMessage(null);
          }
        }}
      />
      </div>
    </div>
  );
};
