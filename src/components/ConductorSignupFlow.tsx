import React, { useEffect, useRef, useState } from 'react';
import {
  AlertTriangle,
  ArrowLeft,
  ArrowRight,
  Bike,
  Camera,
  Car,
  CheckCircle2,
  Clock,
  Eye,
  EyeOff,
  Gift,
  Lock,
  Package,
  Power,
  ShieldCheck,
  Sparkles,
  UserPlus,
} from 'lucide-react';
import confetti from 'canvas-confetti';
import { AppUser, Driver } from '../types';
import {
  checkDuplicateRegistrationSupabase,
  generateUniqueReferralCodeSupabase,
  insertUsuarioSupabase,
  normalizeReferralCodeInput,
  validateReferralCodeExistsSupabase,
  INVALID_REFERRAL_CODE_ERROR,
} from '../supabase';
import { ADMIN_EMAIL, isAppUserAdmin, normalizeEmail } from '../services/userService';
import { compressImageToMax200KB } from '../utils/imageCompression';
import { validateEmailCom, validateWhatsAppBR } from '../utils/documentValidation';
import {
  DriverWorkSelectionView,
  WORK_CATEGORIES,
  WorkCategoryKey,
} from './DriverWorkSelectionView';

interface ConductorSignupFlowProps {
  onBack: () => void;
  onNewDriverRegistered?: (driver: Driver) => void;
  onOpenPrivacyPage?: () => void;
  onOpenAdminPanel?: () => void;
  onNotifyRaceMessage?: (
    title: string,
    message: string,
    type?: 'ride' | 'financial' | 'safety' | 'system'
  ) => void;
}

const MODALITY_ORDER: WorkCategoryKey[] = [
  'motorista_economico',
  'motorista_confort',
  'motoboy_passageiro',
  'motoboy_entregas',
];

const MODALITY_VISUALS: Record<
  WorkCategoryKey,
  {
    border: string;
    bg: string;
    iconBox: string;
    badgeBg: string;
    icon: React.ReactNode;
    shortDesc: string;
  }
> = {
  motorista_economico: {
    border: 'border-slate-300 hover:border-slate-900',
    bg: 'bg-white',
    iconBox: 'bg-slate-100 text-slate-800 border-slate-200',
    badgeBg: 'bg-slate-900 text-white',
    icon: <Car className="w-7 h-7" />,
    shortDesc: 'Carro popular 4 portas (2015+) com ar-condicionado',
  },
  motorista_confort: {
    border: 'border-[#ff6a00] hover:border-[#e05e00]',
    bg: 'bg-gradient-to-br from-[#fff7f0] to-white',
    iconBox: 'bg-[#ff6a00]/15 text-[#ff6a00] border-[#ff6a00]/30',
    badgeBg: 'bg-[#ff6a00] text-white',
    icon: (
      <div className="relative flex items-center justify-center">
        <Car className="w-7 h-7" />
        <Sparkles className="w-3.5 h-3.5 text-amber-500 absolute -top-1.5 -right-2" />
      </div>
    ),
    shortDesc: 'SUV, Sedã ou Hatch Premium (2020+) com mais conforto',
  },
  motoboy_passageiro: {
    border: 'border-cyan-400 hover:border-cyan-600',
    bg: 'bg-gradient-to-br from-[#f2fbff] to-white',
    iconBox: 'bg-cyan-100 text-cyan-700 border-cyan-300',
    badgeBg: 'bg-cyan-700 text-white',
    icon: <Bike className="w-7 h-7" />,
    shortDesc: 'Levar passageiro de moto (2018+, mín. 150cc)',
  },
  motoboy_entregas: {
    border: 'border-amber-400 hover:border-amber-600',
    bg: 'bg-gradient-to-br from-[#fffaf0] to-white',
    iconBox: 'bg-amber-100 text-amber-700 border-amber-300',
    badgeBg: 'bg-amber-600 text-white',
    icon: <Package className="w-7 h-7" />,
    shortDesc: 'Fazer entregas com moto (2015+, baú mín. 90L)',
  },
};

export const ConductorSignupFlow: React.FC<ConductorSignupFlowProps> = ({
  onBack,
  onNewDriverRegistered,
  onOpenPrivacyPage,
  onOpenAdminPanel,
  onNotifyRaceMessage,
}) => {
  const [stage, setStage] = useState<
    'select_modality' | 'simple_register' | 'documents' | 'pending_approval'
  >('select_modality');
  const [selectedModality, setSelectedModality] = useState<WorkCategoryKey>('motorista_economico');

  // Campos do cadastro simples (SEM documentos nesta tela)
  const [regName, setRegName] = useState('');
  const [regEmail, setRegEmail] = useState('');
  const [regWhatsApp, setRegWhatsApp] = useState('');
  const [regLogin, setRegLogin] = useState('');
  const [regPassword, setRegPassword] = useState('');
  const [regConfirmPassword, setRegConfirmPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [regAvatar, setRegAvatar] = useState('');
  const [regIndicadoPor, setRegIndicadoPor] = useState('');
  const [regIndicadoPorError, setRegIndicadoPorError] = useState<string | null>(null);
  const [regError, setRegError] = useState<string | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);

  // Condutor criado após o cadastro simples -> avança para documentos dentro do app -> Pendente
  const [createdUser, setCreatedUser] = useState<AppUser | null>(null);
  const [completedDriver, setCompletedDriver] = useState<Driver | null>(null);

  const fileInputRef = useRef<HTMLInputElement>(null);
  const indicadoPorInputRef = useRef<HTMLInputElement>(null);

  // Preenche código de indicação da URL (?ref=JOSE492) se existir
  useEffect(() => {
    try {
      const params = new URLSearchParams(window.location.search);
      const ref = normalizeReferralCodeInput(params.get('ref') || '');
      if (ref) setRegIndicadoPor(ref);
    } catch {
      // ignore
    }
  }, []);

  const handleChooseModality = (key: WorkCategoryKey) => {
    setSelectedModality(key);
    setRegError(null);
    setRegIndicadoPorError(null);
    setStage('simple_register');
  };

  const handleSelectProfilePhoto = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    setRegError(null);
    compressImageToMax200KB(file)
      .then((compressed) => {
        if (compressed) setRegAvatar(compressed);
      })
      .catch(() => {
        setRegError('Não foi possível ler a imagem selecionada. Tente outra foto da galeria.');
      });
  };

  const handleSimpleRegisterSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setRegError(null);
    setRegIndicadoPorError(null);

    if (!regAvatar) {
      setRegError('Foto de perfil é obrigatória! Adicione sua foto de rosto para continuar.');
      return;
    }

    const cleanName = regName.trim();
    const cleanEmail = regEmail.replace(/\s+/g, '').trim().toLowerCase();
    const cleanWhatsApp = regWhatsApp.replace(/\D/g, '').trim();
    const cleanLogin = regLogin.replace(/\s+/g, '').trim().toLowerCase();

    if (!cleanName || !cleanEmail || !cleanWhatsApp || !cleanLogin || !regPassword) {
      setRegError('Preencha todos os campos obrigatórios: Nome, E-mail, WhatsApp, Login e Senha.');
      return;
    }

    // Trava absoluta: nunca permitir sobrescrever ou cadastrar com e-mail do ADM
    if (isAppUserAdmin({ email: cleanEmail }) || normalizeEmail(cleanEmail) === normalizeEmail(ADMIN_EMAIL)) {
      setRegError('Este e-mail é reservado ao ADM. Utilize um e-mail de condutor diferente.');
      return;
    }

    const emailCheck = validateEmailCom(cleanEmail);
    if (!emailCheck.valid) {
      setRegError(
        emailCheck.error ||
          'E-mail inválido. Digite um e-mail válido com @ e .com (ex: seu.nome@gmail.com).'
      );
      return;
    }

    const whatsCheck = validateWhatsAppBR(cleanWhatsApp);
    if (!whatsCheck.valid) {
      setRegError(
        whatsCheck.error ||
          'WhatsApp inválido! Digite exatamente 11 dígitos com DDD + 9 (ex: 19999999999).'
      );
      return;
    }

    if (regPassword.length < 6) {
      setRegError('A senha deve conter no mínimo 6 dígitos.');
      return;
    }

    if (regPassword !== regConfirmPassword) {
      setRegError('A confirmação de senha não confere com a senha digitada.');
      return;
    }

    setIsSubmitting(true);
    try {
      // 1. Verifica duplicidade de e-mail, WhatsApp e login no Supabase
      const dupCheck = await checkDuplicateRegistrationSupabase({
        email: cleanEmail,
        whatsapp: cleanWhatsApp,
        login: cleanLogin,
      });
      if (dupCheck.isDuplicate && dupCheck.message) {
        setRegError(dupCheck.message);
        return;
      }

      // 2. Valida código de indicação (preservando lógica JOSE492)
      const normalizedReferralInput = normalizeReferralCodeInput(regIndicadoPor);
      if (normalizedReferralInput !== regIndicadoPor) {
        setRegIndicadoPor(normalizedReferralInput);
      }

      const cleanReferralDigits = normalizedReferralInput.replace(/\D/g, '');
      const cleanWhatsAppDigits = cleanWhatsApp.replace(/\D/g, '');
      if (
        normalizedReferralInput &&
        ((cleanReferralDigits && cleanWhatsAppDigits && cleanReferralDigits === cleanWhatsAppDigits) ||
          normalizedReferralInput.toLowerCase() === cleanEmail)
      ) {
        setRegIndicadoPorError(
          'Você não pode usar o seu próprio WhatsApp ou e-mail como código de indicação.'
        );
        indicadoPorInputRef.current?.focus();
        return;
      }

      let normalizedIndicadoPor = '';
      if (normalizedReferralInput) {
        const referralCheck = await validateReferralCodeExistsSupabase(normalizedReferralInput);
        if (!referralCheck.valid) {
          setRegIndicadoPorError(referralCheck.error || INVALID_REFERRAL_CODE_ERROR);
          indicadoPorInputRef.current?.focus();
          return;
        }
        normalizedIndicadoPor = referralCheck.normalizedCode;
      }

      const modalityInfo = WORK_CATEGORIES[selectedModality];
      const chosenAvatar = await compressImageToMax200KB(regAvatar);
      const generatedReferralCode = await generateUniqueReferralCodeSupabase(cleanName);
      const nowIso = new Date().toISOString();

      // 3. Salva cadastro simples na tabela public.usuarios (SEM documentos ainda)
      const supabaseRes = await insertUsuarioSupabase({
        nome: cleanName,
        email: cleanEmail,
        celular: cleanWhatsApp,
        whatsapp: cleanWhatsApp,
        login: cleanLogin,
        senha: regPassword,
        tipo: modalityInfo.userTipo,
        categoria: modalityInfo.title,
        foto: chosenAvatar || '',
        avatar: chosenAvatar || '',
        documentos_aceitos: false,
        indicado_por: normalizedIndicadoPor || undefined,
        indicado_por_codigo: normalizedIndicadoPor || undefined,
        codigo_indicacao: generatedReferralCode,
      });

      if (!supabaseRes.success) {
        const safeErr = String(supabaseRes.error || 'Falha ao salvar cadastro no Supabase.');
        setRegError(safeErr);
        return;
      }

      const supabaseGeneratedId =
        supabaseRes.data?.id !== undefined && supabaseRes.data?.id !== null
          ? String(supabaseRes.data.id)
          : `drv_${Date.now()}`;
      const resolvedCodigoIndicacao = String(
        supabaseRes.data?.codigo_indicacao || generatedReferralCode
      )
        .trim()
        .toUpperCase();
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

      const newDriverObj: Driver = {
        id: supabaseGeneratedId,
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
        category: modalityInfo.vehicleCategory,
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
        indicadoPor: resolvedIndicadoPor,
        indicadoPorCodigo: resolvedIndicadoPorCodigo,
        codigoIndicacao: resolvedCodigoIndicacao,
      };

      const newAppUser: AppUser = {
        id: supabaseGeneratedId,
        name: cleanName,
        email: cleanEmail,
        phone: cleanWhatsApp,
        whatsapp: cleanWhatsApp,
        login: cleanLogin,
        role: modalityInfo.role,
        tipo: modalityInfo.userTipo,
        placa: '',
        avatar: chosenAvatar,
        rating: 0,
        createdAt: nowIso,
        indicadoPor: resolvedIndicadoPor,
        indicadoPorCodigo: resolvedIndicadoPorCodigo,
        codigoIndicacao: resolvedCodigoIndicacao,
        driverData: newDriverObj,
      };

      setCreatedUser(newAppUser);
      setStage('documents');
    } catch (err: any) {
      setRegError(`Erro ao salvar cadastro: ${err?.message || String(err)}`);
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleResetToNewRegistration = () => {
    setRegName('');
    setRegEmail('');
    setRegWhatsApp('');
    setRegLogin('');
    setRegPassword('');
    setRegConfirmPassword('');
    setRegAvatar('');
    setRegError(null);
    setRegIndicadoPorError(null);
    setCreatedUser(null);
    setCompletedDriver(null);
    setStage('select_modality');
  };

  // =========================================================================
  // PASSO 1: ESCOLHA DE MODALIDADE (4 BOTÕES)
  // =========================================================================
  if (stage === 'select_modality') {
    return (
      <div className="max-w-3xl mx-auto space-y-5 animate-fade-in pb-4">
        <div className="flex items-center justify-between gap-2 pb-2 border-b border-slate-200">
          <button
            type="button"
            onClick={onBack}
            className="inline-flex items-center gap-1.5 px-3.5 py-2 rounded-xl bg-slate-100 hover:bg-slate-200 text-slate-800 font-heading font-black text-xs sm:text-sm cursor-pointer transition-all"
          >
            <ArrowLeft className="w-4 h-4" />
            <span>Voltar</span>
          </button>
          <span className="text-[11px] font-mono font-black uppercase px-3 py-1 rounded-full bg-emerald-100 text-emerald-800 border border-emerald-300">
            Cadastro de Condutor
          </span>
        </div>

        <div className="bg-slate-950 text-white rounded-3xl p-5 sm:p-6 border-2 border-emerald-500 shadow-lg space-y-2 text-center">
          <div className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-emerald-500/20 border border-emerald-400/40 text-emerald-300 text-xs font-heading font-black uppercase">
            <UserPlus className="w-4 h-4" />
            <span>Quero ser Condutor - Cadastrar</span>
          </div>
          <h2 className="text-xl sm:text-2xl font-heading font-black text-white">
            Escolha sua modalidade para trabalhar
          </h2>
          <p className="text-xs sm:text-sm text-zinc-300 font-medium max-w-lg mx-auto">
            Selecione 1 das 4 opções abaixo. Primeiro você faz um cadastro simples (sem documentos) e depois envia os documentos dentro do app.
          </p>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
          {MODALITY_ORDER.map((key) => {
            const info = WORK_CATEGORIES[key];
            const vis = MODALITY_VISUALS[key];
            return (
              <button
                key={key}
                type="button"
                onClick={() => handleChooseModality(key)}
                className={`p-5 rounded-3xl border-2 text-left transition-all cursor-pointer flex flex-col justify-between gap-4 shadow-md hover:shadow-xl active:scale-[0.98] ${vis.border} ${vis.bg}`}
              >
                <div className="flex items-start justify-between gap-3">
                  <div
                    className={`w-14 h-14 rounded-2xl border flex items-center justify-center shrink-0 ${vis.iconBox}`}
                  >
                    {vis.icon}
                  </div>
                  <span
                    className={`text-xs font-mono font-black px-3 py-1 rounded-full ${vis.badgeBg}`}
                  >
                    {info.pricePerKm}/km
                  </span>
                </div>

                <div className="space-y-1">
                  <h3 className="font-heading font-black text-slate-950 text-lg sm:text-xl">
                    {info.title}
                  </h3>
                  <p className="text-xs sm:text-sm text-slate-600 font-semibold">
                    {vis.shortDesc}
                  </p>
                </div>

                <div className="flex items-center justify-between pt-2 border-t border-slate-200/80 text-xs font-heading font-black text-emerald-700">
                  <span>Selecionar e cadastrar</span>
                  <ArrowRight className="w-4 h-4" />
                </div>
              </button>
            );
          })}
        </div>
      </div>
    );
  }

  // =========================================================================
  // PASSO 2: CADASTRO SIMPLES (SEM DOCUMENTOS NA TELA DE CADASTRO)
  // =========================================================================
  if (stage === 'simple_register') {
    const activeInfo = WORK_CATEGORIES[selectedModality];
    return (
      <div className="max-w-xl mx-auto space-y-4 animate-fade-in pb-6">
        <div className="flex items-center justify-between gap-2 pb-2 border-b border-slate-200">
          <button
            type="button"
            onClick={() => {
              setRegError(null);
              setRegIndicadoPorError(null);
              setStage('select_modality');
            }}
            className="inline-flex items-center gap-1.5 px-3.5 py-2 rounded-xl bg-slate-100 hover:bg-slate-200 text-slate-800 font-heading font-black text-xs sm:text-sm cursor-pointer transition-all"
          >
            <ArrowLeft className="w-4 h-4" />
            <span>Trocar modalidade</span>
          </button>
          <span className="text-xs font-mono font-black px-3 py-1 rounded-full bg-emerald-600 text-white">
            {activeInfo.title}
          </span>
        </div>

        <div className="bg-white border border-slate-200 rounded-3xl p-5 sm:p-6 shadow-xl space-y-5">
          <div className="space-y-1 text-center">
            <h2 className="text-xl sm:text-2xl font-heading font-black text-slate-950">
              Cadastro Simples — {activeInfo.title}
            </h2>
            <p className="text-xs sm:text-sm text-slate-600 font-medium">
              Preencha seus dados básicos e adicione sua foto de perfil. Os documentos (CNH, CRLV e veículo) serão pedidos na próxima etapa dentro do app.
            </p>
          </div>

          {regError && (
            <div className="bg-rose-50 border-2 border-rose-400 text-rose-900 text-xs sm:text-sm p-3.5 rounded-2xl font-bold flex items-start gap-2.5">
              <AlertTriangle className="w-5 h-5 text-rose-600 shrink-0 mt-0.5" />
              <span>{regError}</span>
            </div>
          )}

          <form onSubmit={handleSimpleRegisterSubmit} className="space-y-4">
            {/* Foto de perfil (obrigatória) */}
            <div className="flex flex-col items-center justify-center py-1">
              <input
                ref={fileInputRef}
                type="file"
                accept="image/*"
                onChange={handleSelectProfilePhoto}
                className="hidden"
              />
              <button
                type="button"
                onClick={() => fileInputRef.current?.click()}
                className={`relative w-28 h-28 rounded-full border-4 flex items-center justify-center overflow-hidden cursor-pointer transition-all shadow-lg ${
                  regAvatar
                    ? 'border-emerald-500 bg-slate-100 ring-4 ring-emerald-500/20'
                    : 'border-dashed border-[#ff6a00] bg-orange-50 hover:bg-orange-100'
                }`}
              >
                {regAvatar ? (
                  <img
                    src={regAvatar}
                    alt="Foto de perfil"
                    className="w-full h-full object-cover"
                  />
                ) : (
                  <div className="flex flex-col items-center text-center p-2">
                    <Camera className="w-8 h-8 text-[#ff6a00] mb-1" />
                    <span className="text-[11px] font-heading font-black text-slate-900 uppercase">
                      Foto de perfil
                    </span>
                    <span className="text-[9px] font-bold text-[#ff6a00] uppercase">
                      * Obrigatória
                    </span>
                  </div>
                )}
              </button>
              <button
                type="button"
                onClick={() => fileInputRef.current?.click()}
                className="mt-2 text-xs font-heading font-black text-emerald-700 hover:text-emerald-600 cursor-pointer flex items-center gap-1.5 uppercase"
              >
                <Camera className="w-3.5 h-3.5" />
                <span>{regAvatar ? 'Trocar foto de perfil ✓' : 'Selecionar foto da galeria *'}</span>
              </button>
            </div>

            {/* Nome */}
            <div className="space-y-1">
              <label className="text-xs font-bold text-slate-800 uppercase tracking-wider block">
                Nome Completo *
              </label>
              <input
                type="text"
                required
                value={regName}
                onChange={(e) => setRegName(e.target.value)}
                placeholder="Ex: Carlos Eduardo Silva"
                className="w-full bg-slate-50 border border-slate-300 rounded-2xl px-4 py-3 text-sm font-medium text-slate-900 focus:outline-none focus:border-emerald-500"
              />
            </div>

            {/* E-mail */}
            <div className="space-y-1">
              <label className="text-xs font-bold text-slate-800 uppercase tracking-wider block">
                E-mail *
              </label>
              <input
                type="email"
                required
                value={regEmail}
                onChange={(e) => setRegEmail(e.target.value)}
                placeholder="seu.email@gmail.com"
                className="w-full bg-slate-50 border border-slate-300 rounded-2xl px-4 py-3 text-sm font-medium text-slate-900 focus:outline-none focus:border-emerald-500"
              />
            </div>

            {/* WhatsApp */}
            <div className="space-y-1">
              <label className="text-xs font-bold text-slate-800 uppercase tracking-wider block">
                WhatsApp *
              </label>
              <input
                type="tel"
                required
                value={regWhatsApp}
                onChange={(e) => setRegWhatsApp(e.target.value)}
                placeholder="(19) 99999-9999"
                className="w-full bg-slate-50 border border-slate-300 rounded-2xl px-4 py-3 text-sm font-medium text-slate-900 focus:outline-none focus:border-emerald-500"
              />
            </div>

            {/* Login */}
            <div className="space-y-1">
              <label className="text-xs font-bold text-slate-800 uppercase tracking-wider block">
                Login *
              </label>
              <input
                type="text"
                required
                value={regLogin}
                onChange={(e) => setRegLogin(e.target.value)}
                placeholder="Ex: carlos.indaiatuba"
                className="w-full bg-slate-50 border border-slate-300 rounded-2xl px-4 py-3 text-sm font-mono font-medium text-slate-900 focus:outline-none focus:border-emerald-500"
              />
            </div>

            {/* Senha + Confirmar */}
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              <div className="space-y-1">
                <label className="text-xs font-bold text-slate-800 uppercase tracking-wider block">
                  Senha (mín. 6) *
                </label>
                <div className="relative">
                  <input
                    type={showPassword ? 'text' : 'password'}
                    required
                    value={regPassword}
                    onChange={(e) => setRegPassword(e.target.value)}
                    placeholder="••••••"
                    className="w-full bg-slate-50 border border-slate-300 rounded-2xl px-4 py-3 pr-10 text-sm font-medium text-slate-900 focus:outline-none focus:border-emerald-500"
                  />
                  <button
                    type="button"
                    onClick={() => setShowPassword((prev) => !prev)}
                    className="absolute right-3 top-3 text-slate-500 hover:text-slate-900 cursor-pointer"
                  >
                    {showPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                  </button>
                </div>
              </div>

              <div className="space-y-1">
                <label className="text-xs font-bold text-slate-800 uppercase tracking-wider block">
                  Confirmar Senha *
                </label>
                <input
                  type={showPassword ? 'text' : 'password'}
                  required
                  value={regConfirmPassword}
                  onChange={(e) => setRegConfirmPassword(e.target.value)}
                  placeholder="••••••"
                  className="w-full bg-slate-50 border border-slate-300 rounded-2xl px-4 py-3 text-sm font-medium text-slate-900 focus:outline-none focus:border-emerald-500"
                />
              </div>
            </div>

            {/* Código de quem indicou (opcional — mantém JOSE492 intacto) */}
            <div
              className={`space-y-1.5 p-3.5 rounded-2xl border ${
                regIndicadoPorError
                  ? 'bg-rose-50 border-rose-400'
                  : 'bg-orange-50/70 border-orange-300'
              }`}
            >
              <label className="text-orange-800 text-xs font-bold uppercase tracking-wider flex items-center gap-1.5">
                <Gift className="w-3.5 h-3.5 text-[#ff6a00] shrink-0" />
                <span>Código de quem indicou (opcional)</span>
              </label>
              <input
                ref={indicadoPorInputRef}
                type="text"
                value={regIndicadoPor}
                onChange={(e) => {
                  setRegIndicadoPor(e.target.value.toUpperCase());
                  if (regIndicadoPorError) setRegIndicadoPorError(null);
                }}
                placeholder="Ex: JOSE492"
                className="w-full bg-white border border-orange-300 rounded-xl px-3.5 py-2.5 text-sm font-mono font-bold text-slate-900 uppercase focus:outline-none focus:border-[#ff6a00]"
              />
              {regIndicadoPorError && (
                <p className="text-xs font-bold text-rose-700">{regIndicadoPorError}</p>
              )}
            </div>

            <button
              type="submit"
              disabled={isSubmitting}
              className="w-full py-4 px-6 rounded-2xl bg-emerald-600 hover:bg-emerald-500 disabled:opacity-60 active:scale-[0.99] text-white font-heading font-black text-base uppercase tracking-wider shadow-lg flex items-center justify-center gap-2 cursor-pointer transition-all"
            >
              <span>
                {isSubmitting ? 'SALVANDO CADASTRO...' : 'CONTINUAR PARA ENVIAR DOCUMENTOS'}
              </span>
              {!isSubmitting && <ArrowRight className="w-5 h-5" />}
            </button>
          </form>
        </div>
      </div>
    );
  }

  // =========================================================================
  // PASSO 3: DOCUMENTOS DENTRO DO APP (CNH Frente, CNH Verso, CRLV, Foto carro/moto,
  // Modelo, Cor, Placa, Ano, CPF, CNH, Chave PIX — travando CPF, CNH e placa inválidos)
  // =========================================================================
  if (stage === 'documents' && createdUser) {
    return (
      <div className="max-w-3xl mx-auto space-y-4 animate-fade-in pb-6">
        <div className="bg-emerald-50 border-2 border-emerald-400 text-emerald-950 rounded-2xl p-4 flex items-center justify-between gap-3 shadow-xs">
          <div className="flex items-center gap-3 min-w-0">
            {createdUser.avatar && (
              <img
                src={createdUser.avatar}
                alt={createdUser.name}
                className="w-11 h-11 rounded-full object-cover border-2 border-emerald-500 shrink-0"
              />
            )}
            <div className="min-w-0">
              <p className="font-heading font-black text-sm text-emerald-900 truncate">
                Conta criada: {createdUser.name}
              </p>
              <p className="text-xs text-emerald-800 font-semibold">
                Agora envie seus documentos e dados do veículo para análise do ADM.
              </p>
            </div>
          </div>
          <span className="text-[11px] font-mono font-black px-2.5 py-1 rounded-full bg-emerald-600 text-white shrink-0">
            Etapa 2 de 2
          </span>
        </div>

        <DriverWorkSelectionView
          currentUser={createdUser}
          initialWorkKey={selectedModality}
          skipToDocuments={true}
          preserveCurrentSession={true}
          hideLockedOnlineButton={true}
          onOpenPrivacyPage={onOpenPrivacyPage}
          onOpenAdminPanel={onOpenAdminPanel}
          onNotifyRaceMessage={onNotifyRaceMessage}
          onCompleteDriverRegister={(newDriver) => {
            const pendingDriver: Driver = {
              ...newDriver,
              approvalStatus: 'pendente',
              status: 'pending_approval',
              categoryConfigured: true,
              requirementsConfirmed: true,
              documentosAceitos: true,
            };
            setCompletedDriver(pendingDriver);
            onNewDriverRegistered?.(pendingDriver);
            try {
              confetti({ particleCount: 70, spread: 75, origin: { y: 0.6 } });
            } catch {
              // ignore
            }
            setStage('pending_approval');
          }}
        />
      </div>
    );
  }

  // =========================================================================
  // PASSO 4: PENDENTE — "AGUARDANDO APROVAÇÃO" + BOTÃO FICAR ONLINE CINZA E BLOQUEADO
  // =========================================================================
  if (stage === 'pending_approval' && completedDriver) {
    const modalityInfo = WORK_CATEGORIES[selectedModality];
    return (
      <div className="max-w-2xl mx-auto space-y-5 animate-fade-in pb-6">
        <div className="bg-white border-2 border-amber-400 rounded-3xl p-6 sm:p-7 shadow-xl space-y-5">
          {/* Cabeçalho do Condutor Pendente */}
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 pb-4 border-b border-slate-200">
            <div className="flex items-center gap-3.5 min-w-0">
              {completedDriver.avatar ? (
                <img
                  src={completedDriver.avatar}
                  alt={completedDriver.name}
                  className="w-16 h-16 rounded-full object-cover border-3 border-amber-400 shadow-md shrink-0"
                />
              ) : (
                <div className="w-16 h-16 rounded-full bg-slate-200 flex items-center justify-center shrink-0">
                  <ShieldCheck className="w-8 h-8 text-slate-500" />
                </div>
              )}
              <div className="min-w-0">
                <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full bg-amber-100 text-amber-900 border border-amber-300 text-[11px] font-mono font-black uppercase">
                  <Clock className="w-3 h-3" />
                  <span>Pendente</span>
                </span>
                <h2 className="font-heading font-black text-slate-950 text-xl truncate mt-1">
                  {completedDriver.name}
                </h2>
                <p className="text-xs font-bold text-slate-600">
                  {modalityInfo.title} • {completedDriver.vehicleModel} ({completedDriver.vehicleYear}) •{' '}
                  <span className="font-mono">{completedDriver.vehiclePlate}</span>
                </p>
              </div>
            </div>

            {/* Botão Ficar Online CINZA e BLOQUEADO */}
            <button
              type="button"
              disabled
              className="flex items-center justify-center gap-2 px-5 py-3.5 rounded-2xl bg-slate-300 text-slate-500 border-2 border-slate-400 font-heading font-black text-xs sm:text-sm cursor-not-allowed shrink-0 uppercase tracking-wide"
            >
              <Lock className="w-4 h-4 shrink-0" />
              <Power className="w-4 h-4 shrink-0" />
              <span>FICAR ONLINE</span>
            </button>
          </div>

          {/* Mensagem obrigatória: AGUARDANDO APROVAÇÃO */}
          <div className="bg-amber-50 border-2 border-amber-400 rounded-2xl p-5 text-center space-y-2">
            <div className="w-12 h-12 rounded-full bg-amber-200/70 text-amber-800 flex items-center justify-center mx-auto">
              <Clock className="w-6 h-6" />
            </div>
            <h3 className="text-xl sm:text-2xl font-heading font-black text-amber-950 uppercase tracking-wide">
              AGUARDANDO APROVAÇÃO
            </h3>
            <p className="text-xs sm:text-sm text-amber-900 font-semibold max-w-md mx-auto">
              Seu cadastro e seus documentos (CNH Frente, CNH Verso, CRLV e Foto do veículo) foram enviados com sucesso para a fila <strong>Pendente</strong> do ADM. O botão <strong>Ficar Online</strong> permanece cinza e bloqueado até a aprovação.
            </p>
          </div>

          <div className="bg-emerald-50 border-2 border-emerald-400 rounded-2xl p-4 flex items-start gap-3 text-xs sm:text-sm text-emerald-950 font-bold">
            <CheckCircle2 className="w-5 h-5 text-emerald-600 shrink-0 mt-0.5" />
            <div className="space-y-0.5">
              <span className="text-[10px] font-mono font-black uppercase text-emerald-700 block">
                Mensagem Automática • RACE
              </span>
              <p>Cadastro completo! AGUARDANDO APROVAÇÃO! - Equipe RACE</p>
            </div>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 pt-1">
            <button
              type="button"
              onClick={onBack}
              className="py-3.5 px-5 rounded-2xl bg-slate-900 hover:bg-slate-800 text-white font-heading font-black text-xs sm:text-sm uppercase cursor-pointer transition-all flex items-center justify-center gap-2"
            >
              <ArrowLeft className="w-4 h-4" />
              <span>Voltar para Condutores</span>
            </button>
            <button
              type="button"
              onClick={handleResetToNewRegistration}
              className="py-3.5 px-5 rounded-2xl bg-emerald-600 hover:bg-emerald-500 text-white font-heading font-black text-xs sm:text-sm uppercase cursor-pointer transition-all flex items-center justify-center gap-2"
            >
              <UserPlus className="w-4 h-4" />
              <span>Cadastrar outro Condutor</span>
            </button>
          </div>
        </div>
      </div>
    );
  }

  return null;
};
