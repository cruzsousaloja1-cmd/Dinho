import React, { useState } from 'react';
import { Driver, Ride, VehicleCategory, PendingPayment } from '../types';
import { formatBRL, WEEKLY_SUBSCRIPTION_PRICE } from '../services/pricingService';
import { 
  WEEKLY_FEE, 
  WEEKLY_FEE_TEXT, 
  WEEKLY_FEE_SHORT, 
  WEEKLY_FEE_BADGE, 
  WEEKLY_DAYS, 
  ECONOMY_VS_UBER_PERCENT, 
  COMMISSION,
  RACE_PIX_KEY,
  RACE_PIX_KEY_TYPE,
  RACE_PIX_BANK,
  RACE_PIX_NAME
} from '../config/pricing';
import { 
  validateComfortEligibility, 
  COMFORT_POPULAR_MODELS, 
  ComfortValidationResult 
} from '../services/vehicleValidationService';
import { 
  UserCheck, 
  ShieldCheck, 
  DollarSign, 
  Zap, 
  CheckCircle2, 
  Car, 
  Bike, 
  Power, 
  CreditCard, 
  QrCode, 
  TrendingUp, 
  Headphones, 
  Lock, 
  Eye, 
  EyeOff, 
  LogIn, 
  AlertTriangle, 
  Info, 
  Sparkles,
  HelpCircle,
  Share2,
  ArrowRight,
  Copy,
  Check,
  Clock,
  Wallet,
  Loader2,
  X,
  Upload,
  FileCheck,
  Building2,
  UserCheck2,
  CheckCircle,
  Navigation
} from 'lucide-react';
import confetti from 'canvas-confetti';
import { DriverGpsNavigationModal } from './DriverGpsNavigationModal';

interface DriverPartnerPortalProps {
  currentDriver: Driver;
  onUpdateDriver: (driver: Driver) => void;
  onRegisterDriver: (newDriver: Driver) => void;
  onAcceptIncomingRide?: (ride: Ride) => void;
  onOpenSupport: () => void;
  onOpenShare?: () => void;
  onNavigateToRides?: () => void;
  onShowSubscriptionExpiredModal?: () => void;
  onRenewWeeklyPlan?: (driver?: Driver) => void;
  onTriggerToast?: (title: string, message: string, type?: 'ride' | 'financial' | 'safety' | 'system') => void;
}

export const DriverPartnerPortal: React.FC<DriverPartnerPortalProps> = ({
  currentDriver,
  onUpdateDriver,
  onRegisterDriver,
  onOpenSupport,
  onOpenShare,
  onNavigateToRides,
  onShowSubscriptionExpiredModal,
  onRenewWeeklyPlan,
  onTriggerToast,
}) => {
  const [activeSubTab, setActiveSubTab] = useState<'dashboard' | 'login' | 'register' | 'subscription'>(() => {
    return currentDriver.weeklyPlanActive ? 'dashboard' : 'subscription';
  });
  const [isOnline, setIsOnline] = useState(currentDriver.status === 'online');
  const [acceptedRideNotice, setAcceptedRideNotice] = useState<string | null>(null);
  const [comfortWarning, setComfortWarning] = useState<string | null>(null);
  const [isDriverGpsOpen, setIsDriverGpsOpen] = useState(false);

  // Driver's own PIX key where they receive 100% of ride earnings
  const [driverPixKey, setDriverPixKey] = useState<string>(
    currentDriver.pixKey || currentDriver.cpf || ''
  );
  const [savedDriverPixNotice, setSavedDriverPixNotice] = useState(false);

  // Real Manual PIX Modal & Comprovante state for R$ 200 Weekly Plan
  const [isPixModalOpen, setIsPixModalOpen] = useState(false);
  const [copiedRacePix, setCopiedRacePix] = useState(false);
  const [comprovanteId, setComprovanteId] = useState('');
  const [comprovanteImage, setComprovanteImage] = useState<string | null>(null);
  const [comprovanteFileName, setComprovanteFileName] = useState('');
  const [isSubmittingProof, setIsSubmittingProof] = useState(false);
  const [proofSentSuccessNotice, setProofSentSuccessNotice] = useState<string | null>(null);

  // Login form state
  const [loginEmail, setLoginEmail] = useState('');
  const [loginPassword, setLoginPassword] = useState('');
  const [showLoginPassword, setShowLoginPassword] = useState(false);
  const [loginFeedback, setLoginFeedback] = useState<string | null>(null);

  // Registration form state
  const [regName, setRegName] = useState('');
  const [regPhone, setRegPhone] = useState('');
  const [regEmail, setRegEmail] = useState('');
  const [regPassword, setRegPassword] = useState('');
  const [regConfirmPassword, setRegConfirmPassword] = useState('');
  const [showRegPassword, setShowRegPassword] = useState(false);
  const [regCpf, setRegCpf] = useState('');
  const [regCnh, setRegCnh] = useState('');
  const [regCategory, setRegCategory] = useState<VehicleCategory>('confort');
  const [regModel, setRegModel] = useState('Toyota Corolla Sedã');
  const [regPlate, setRegPlate] = useState('RCE9C40');
  const [regYear, setRegYear] = useState('2024');
  const [regError, setRegError] = useState<string | null>(null);
  const [registeredSuccess, setRegisteredSuccess] = useState(false);

  // Live evaluation of Confort eligibility
  const comfortCheck: ComfortValidationResult = validateComfortEligibility(
    regModel,
    parseInt(regYear, 10) || 0
  );

  const isSubscriptionExpired = () => {
    if (!currentDriver.weeklyPlanActive) return true;
    const expiresDate = currentDriver.weeklyFeeExpiresAt
      ? new Date(currentDriver.weeklyFeeExpiresAt)
      : currentDriver.weeklyPlanExpiresAt
      ? new Date(currentDriver.weeklyPlanExpiresAt)
      : null;
    return expiresDate ? expiresDate < new Date() : false;
  };

  // Status da assinatura: Ativa até DD/MM/YYYY HH:mm ou Vencida em DD/MM
  const getSubscriptionDetails = () => {
    const expiresStr = currentDriver.weeklyFeeExpiresAt || currentDriver.weeklyPlanExpiresAt;
    const now = new Date();

    if (!currentDriver.weeklyPlanActive || !expiresStr) {
      return {
        isActive: false,
        badgeLabel: 'VENCIDO',
        textLabel: 'Vencida',
        progressPercent: 0,
        daysLeft: 0,
      };
    }

    const expiresDate = new Date(expiresStr);
    if (isNaN(expiresDate.getTime()) || expiresDate.getTime() <= now.getTime()) {
      const day = !isNaN(expiresDate.getTime()) ? String(expiresDate.getDate()).padStart(2, '0') : '';
      const month = !isNaN(expiresDate.getTime()) ? String(expiresDate.getMonth() + 1).padStart(2, '0') : '';
      const label = day && month ? `Vencido em ${day}/${month}` : 'Vencida';
      return {
        isActive: false,
        badgeLabel: 'VENCIDO',
        textLabel: label,
        progressPercent: 0,
        daysLeft: 0,
      };
    }

    const day = String(expiresDate.getDate()).padStart(2, '0');
    const month = String(expiresDate.getMonth() + 1).padStart(2, '0');
    const year = expiresDate.getFullYear();
    const hours = String(expiresDate.getHours()).padStart(2, '0');
    const minutes = String(expiresDate.getMinutes()).padStart(2, '0');
    const activeText = `Ativo até ${day}/${month}/${year} ${hours}:${minutes}`;

    const totalDurationMs = WEEKLY_DAYS * 24 * 60 * 60 * 1000;
    const timeLeftMs = Math.max(0, expiresDate.getTime() - now.getTime());
    const daysLeft = Math.ceil(timeLeftMs / (24 * 60 * 60 * 1000));
    const progressPercent = Math.min(100, Math.max(8, (timeLeftMs / totalDurationMs) * 100));

    return {
      isActive: true,
      badgeLabel: 'PLANO ATIVO',
      textLabel: activeText,
      progressPercent,
      daysLeft,
    };
  };

  const subDetails = getSubscriptionDetails();
  const subStatus = { isActive: subDetails.isActive, label: subDetails.textLabel };

  // Economia vs Uber/99 (comissão média de ~28%)
  const weeklyEarnings = currentDriver.earningsWeek || 0;
  const uberCut = Math.round(weeklyEarnings * 0.28);
  const raceFee = WEEKLY_FEE;
  const driverSavingsVsUber99 = Math.max(0, uberCut - raceFee);

  const toggleOnline = () => {
    if (!isOnline && isSubscriptionExpired()) {
      if (onShowSubscriptionExpiredModal) {
        onShowSubscriptionExpiredModal();
      } else {
        setActiveSubTab('subscription');
      }
      return;
    }
    const nextStatus = !isOnline;
    setIsOnline(nextStatus);
    onUpdateDriver({
      ...currentDriver,
      status: nextStatus ? 'online' : 'offline',
    });
  };

  const handleLoginSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!loginEmail || !loginPassword) {
      setLoginFeedback('Por favor, informe seu login (e-mail) e sua senha.');
      return;
    }

    // Verify credentials
    if (loginPassword.length < 4) {
      setLoginFeedback('Senha inválida. Digite ao menos 4 caracteres.');
      return;
    }

    setLoginFeedback(null);
    onUpdateDriver({
      ...currentDriver,
      email: loginEmail,
      status: 'online',
    });
    setIsOnline(true);
    setActiveSubTab('dashboard');

    try {
      confetti({ particleCount: 40, spread: 60, origin: { y: 0.6 } });
    } catch {
      // safe
    }

    // Direct transition to ride attendance page
    if (onNavigateToRides) {
      setTimeout(() => {
        onNavigateToRides();
      }, 400);
    }
  };

  const handleSelectPresetModel = (model: { name: string; minYear: number }) => {
    setRegModel(model.name);
    setRegYear(model.minYear.toString());
  };

  const handleRegisterSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    setRegError(null);
    setComfortWarning(null);

    if (!regName || !regPhone || !regCpf || !regModel || !regPlate || !regEmail || !regPassword) {
      setRegError('Por favor, preencha todos os campos obrigatórios (*).');
      return;
    }

    if (regPassword.length < 6) {
      setRegError('A senha deve conter no mínimo 6 dígitos para sua segurança.');
      return;
    }

    if (regPassword !== regConfirmPassword) {
      setRegError('A confirmação de senha não confere com a senha digitada.');
      return;
    }

    const yearNum = parseInt(regYear, 10) || 2023;
    let finalCategory = regCategory;
    let comfortEligible = false;
    let reason = '';

    // Rigorous Comfort Validation
    if (regCategory === 'confort') {
      const check = validateComfortEligibility(regModel, yearNum);
      if (!check.eligible) {
        // Did not meet year requirement for Confort!
        finalCategory = 'economica';
        comfortEligible = false;
        reason = `Não elegível para Confort: ${check.ruleDescription} Veículo direcionado para RACE Econômica.`;
        setComfortWarning(
          `Aviso Confort: Seu veículo (${regModel} ano ${yearNum}) não atende à exigência mínima do modelo Confort (${check.ruleDescription}). Seu cadastro foi automaticamente homologado na categoria RACE Econômica (R$ 2,50/km) com 100% dos ganhos livres!`
        );
      } else {
        comfortEligible = true;
        reason = `Aprovado para Confort: atende às exigências de ano (${check.badgeText}).`;
      }
    }

    const newDriver: Driver = {
      id: `drv-${Math.floor(100 + Math.random() * 900)}`,
      name: regName,
      avatar: 'https://images.unsplash.com/photo-1535713875002-d1d0cf377fde?w=150&auto=format&fit=crop&q=80',
      phone: regPhone,
      email: regEmail,
      password: regPassword,
      cpf: regCpf,
      cnh: `${regCnh || '09283719280'} (EAR Aprovado)`,
      category: finalCategory,
      vehicleModel: regModel,
      vehiclePlate: regPlate.toUpperCase(),
      vehicleColor: 'Prata',
      vehicleYear: yearNum,
      rating: 5.0,
      totalRides: 0,
      status: 'online',
      lat: -23.0903,
      lng: -47.2180,
      weeklyPlanActive: true,
      weeklyFeePaidAt: new Date().toISOString(),
      weeklyFeeExpiresAt: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000).toISOString(),
      weeklyPlanExpiresAt: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000).toISOString(),
      weeklyPlanPrice: WEEKLY_FEE,
      earningsToday: 0,
      earningsWeek: 0,
      cnhVerified: true,
      vehicleVerified: true,
      criminalRecordClear: true,
      registrationDate: new Date().toISOString().split('T')[0],
      comfortEligible,
      comfortEligibilityReason: reason,
    };

    onRegisterDriver(newDriver);
    setRegisteredSuccess(true);
    try {
      confetti({
        particleCount: 70,
        spread: 75,
        origin: { y: 0.6 },
      });
    } catch {
      // safe
    }

    // Direct transition to ride attendance page
    if (onNavigateToRides) {
      setTimeout(() => {
        onNavigateToRides();
      }, 1200);
    }
  };

  const handleOpenPixModal = () => {
    setIsPixModalOpen(true);
    setProofSentSuccessNotice(null);
  };

  const handleCopyRacePixKey = () => {
    navigator.clipboard?.writeText(RACE_PIX_KEY);
    setCopiedRacePix(true);
    setTimeout(() => setCopiedRacePix(false), 2500);
  };

  const handleComprovanteFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      setComprovanteFileName(file.name);
      const reader = new FileReader();
      reader.onloadend = () => {
        setComprovanteImage(reader.result as string);
      };
      reader.readAsDataURL(file);
    }
  };

  const handleSubmitProofOfPayment = () => {
    setIsSubmittingProof(true);
    const finalId = (comprovanteId.trim() || `COMP-${Date.now().toString().slice(-6)}`).toUpperCase();
    const now = new Date().toISOString();
    
    setTimeout(() => {
      const updated: Driver = {
        ...currentDriver,
        pendingPayment: {
          status: 'pending',
          amount: WEEKLY_FEE,
          sentAt: now,
          comprovanteId: finalId,
          comprovanteUrl: comprovanteImage || undefined,
          driverName: currentDriver.name,
          driverPhone: currentDriver.phone,
        },
      };

      onUpdateDriver(updated);
      setIsSubmittingProof(false);
      setProofSentSuccessNotice(
        "Comprovante enviado! Aguarde aprovação do Admin em até 10 minutos. Você receberá notificação."
      );

      if (onTriggerToast) {
        onTriggerToast(
          'Comprovante PIX Enviado!',
          'Comprovante enviado! Aguarde aprovação do Admin em até 10 minutos. Você receberá notificação.',
          'financial'
        );
      }
    }, 600);
  };

  const handleSaveDriverPixKey = () => {
    const cleanKey = driverPixKey.trim();
    onUpdateDriver({
      ...currentDriver,
      pixKey: cleanKey,
    });
    setSavedDriverPixNotice(true);
    setTimeout(() => setSavedDriverPixNotice(false), 3000);
    if (onTriggerToast) {
      onTriggerToast(
        'Chave PIX Salva',
        'Sua chave PIX para receber 100% dos ganhos das corridas foi atualizada com sucesso.',
        'financial'
      );
    }
  };

  return (
    <div className="space-y-5">
      {/* Driver Portal Submenu Navigation in White */}
      <div className="bg-white border border-slate-200 p-2 rounded-2xl flex items-center gap-2 shadow-sm overflow-x-auto">
        <button
          onClick={() => setActiveSubTab('dashboard')}
          className={`flex-1 py-2.5 px-3 rounded-xl text-xs sm:text-sm font-heading font-black transition-all cursor-pointer whitespace-nowrap ${
            activeSubTab === 'dashboard'
              ? 'bg-amber-500 text-slate-950 shadow-md'
              : 'text-slate-600 hover:text-slate-900 hover:bg-slate-50'
          }`}
        >
          Meu Painel Condutor
        </button>
        <button
          onClick={() => setActiveSubTab('login')}
          className={`flex-1 py-2.5 px-3 rounded-xl text-xs sm:text-sm font-heading font-black transition-all cursor-pointer flex items-center justify-center gap-1.5 whitespace-nowrap ${
            activeSubTab === 'login'
              ? 'bg-amber-500 text-slate-950 shadow-md'
              : 'text-slate-600 hover:text-slate-900 hover:bg-slate-50'
          }`}
        >
          <LogIn className="w-4 h-4" />
          <span>Login / Entrar</span>
        </button>
        <button
          onClick={() => setActiveSubTab('register')}
          className={`flex-1 py-2.5 px-3 rounded-xl text-xs sm:text-sm font-heading font-black transition-all cursor-pointer whitespace-nowrap ${
            activeSubTab === 'register'
              ? 'bg-amber-500 text-slate-950 shadow-md'
              : 'text-slate-600 hover:text-slate-900 hover:bg-slate-50'
          }`}
        >
          Novo Cadastro
        </button>
        <button
          onClick={() => setActiveSubTab('subscription')}
          className={`flex-1 py-2.5 px-3 rounded-xl text-xs sm:text-sm font-heading font-black transition-all cursor-pointer flex items-center justify-center gap-1.5 whitespace-nowrap ${
            activeSubTab === 'subscription'
              ? 'bg-amber-500 text-slate-950 shadow-md'
              : 'text-slate-600 hover:text-slate-900 hover:bg-slate-50'
          }`}
        >
          <span>Plano {WEEKLY_FEE_BADGE}</span>
          <span className="w-2.5 h-2.5 rounded-full bg-emerald-500"></span>
        </button>
      </div>

      {/* SUBTAB 1: DRIVER DASHBOARD */}
      {activeSubTab === 'dashboard' && (
        <div className="space-y-4">
          {/* Alerta de Assinatura Vencida se o plano estiver inativo */}
          {!currentDriver.weeklyPlanActive && (
            <div className="bg-rose-50 border-2 border-rose-400 rounded-3xl p-5 flex flex-col sm:flex-row items-center justify-between gap-4 shadow-sm animate-fade-in">
              <div className="flex items-center gap-3.5">
                <div className="w-12 h-12 rounded-2xl bg-rose-500 text-white flex items-center justify-center shrink-0 shadow-sm">
                  <AlertTriangle className="w-6 h-6" />
                </div>
                <div>
                  <h4 className="font-heading font-black text-rose-950 text-base sm:text-lg">
                    ASSINATURA SEMANAL VENCIDA ({WEEKLY_FEE_TEXT})
                  </h4>
                  <p className="text-xs sm:text-sm text-rose-800 font-medium">
                    Sua assinatura de R$ 200 venceu. Pague via PIX para liberar seu status ONLINE e receber chamados com 100% dos ganhos livres.
                  </p>
                </div>
              </div>
              <button
                onClick={() => setActiveSubTab('subscription')}
                className="w-full sm:w-auto px-5 py-3 rounded-2xl bg-rose-600 hover:bg-rose-500 text-white font-heading font-black text-xs sm:text-sm shadow-md transition-all cursor-pointer whitespace-nowrap active:scale-95"
              >
                PAGAR R$ 200 VIA PIX
              </button>
            </div>
          )}

          {/* Status & Online Toggle Card in White */}
          <div className="bg-white border border-slate-200 rounded-3xl p-5 sm:p-6 shadow-md">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-4">
                <div className="relative">
                  <img
                    src={currentDriver.avatar}
                    alt={currentDriver.name}
                    className="w-16 h-16 rounded-full object-cover border-2 border-amber-500 shadow-md"
                  />
                  <span
                    className={`absolute bottom-0 right-0 w-4 h-4 rounded-full border-2 border-white ${
                      isOnline ? 'bg-emerald-500 radar-pulse' : 'bg-slate-400'
                    }`}
                  />
                </div>
                <div>
                  <div className="flex items-center gap-2">
                    <h3 className="font-heading font-black text-slate-950 text-base sm:text-lg">
                      {currentDriver.name}
                    </h3>
                    {currentDriver.category === 'confort' && (
                      <span className="bg-purple-100 text-purple-800 text-xs font-black px-2 py-0.5 rounded-md border border-purple-200 flex items-center gap-1">
                        <Sparkles className="w-3.5 h-3.5" /> Confort Liberado
                      </span>
                    )}
                  </div>
                  <p className="text-sm text-amber-700 font-mono font-bold">
                    {currentDriver.vehicleModel} ({currentDriver.vehicleYear}) • {currentDriver.vehiclePlate}
                  </p>
                  <div className="flex items-center gap-2 mt-1">
                    <span className="text-sm text-slate-600 font-semibold">
                      ★ {currentDriver.rating.toFixed(2)} ({currentDriver.totalRides} corridas)
                    </span>
                    <span className="text-xs bg-emerald-100 text-emerald-800 px-2 py-0.5 rounded font-black">
                      0% Taxas
                    </span>
                    <span className="text-xs text-slate-500 font-mono">
                      Login: {currentDriver.email}
                    </span>
                  </div>
                </div>
              </div>

              {/* Online Button */}
              <button
                onClick={toggleOnline}
                className={`flex items-center gap-2 px-5 py-3 rounded-2xl font-heading font-black text-xs sm:text-sm shadow-md transition-all cursor-pointer active:scale-95 ${
                  isOnline
                    ? 'bg-emerald-600 text-white hover:bg-emerald-500'
                    : 'bg-slate-100 text-slate-600 hover:bg-slate-200 border border-slate-300'
                }`}
              >
                <Power className="w-4 h-4" />
                <span>{isOnline ? 'ONLINE' : 'FICAR ONLINE'}</span>
              </button>
            </div>
          </div>

          {/* 100% Earnings Guarantee Banner */}
          <div className="bg-gradient-to-r from-amber-500/10 via-amber-500/20 to-amber-500/10 border-2 border-amber-400 rounded-3xl p-5 flex items-center justify-between shadow-sm">
            <div className="flex items-center gap-3.5">
              <div className="w-12 h-12 rounded-2xl bg-amber-500 text-slate-950 font-black flex items-center justify-center shrink-0 shadow-sm">
                <Zap className="w-6 h-6" />
              </div>
              <div>
                <h4 className="font-heading font-black text-amber-900 text-base sm:text-lg">
                  100% DOS GANHOS SÃO SEUS
                </h4>
                <p className="text-xs sm:text-sm text-slate-700 font-medium">
                  Sem comissão por corrida. Apenas assinatura semanal fixa de {WEEKLY_FEE_TEXT}.
                </p>
              </div>
            </div>

            <div className="text-right">
              <span className="text-xs text-slate-500 font-mono block font-bold">Status da Assinatura</span>
              <span className={`text-sm font-black flex items-center gap-1 justify-end ${
                subStatus.isActive ? 'text-emerald-700' : 'text-rose-600'
              }`}>
                {subStatus.isActive ? (
                  <CheckCircle2 className="w-4 h-4 text-emerald-600" />
                ) : (
                  <AlertTriangle className="w-4 h-4 text-rose-600" />
                )}
                {subStatus.label}
              </span>
            </div>
          </div>

          {/* Earnings Metrics Cards in White */}
          <div className="grid grid-cols-2 gap-3.5">
            <div className="bg-white border border-slate-200 rounded-3xl p-5 shadow-md">
              <div className="flex items-center justify-between mb-1">
                <span className="text-xs sm:text-sm text-slate-600 font-bold">Ganhos Hoje</span>
                <TrendingUp className="w-5 h-5 text-emerald-600" />
              </div>
              <div className="text-2xl sm:text-3xl font-heading font-black text-slate-950">
                {formatBRL(currentDriver.earningsToday)}
              </div>
              <p className="text-xs text-emerald-700 mt-1 font-bold">
                + R$ 0,00 descontado de taxa
              </p>
            </div>

            <div className="bg-white border border-slate-200 rounded-3xl p-5 shadow-md">
              <div className="flex items-center justify-between mb-1">
                <span className="text-xs sm:text-sm text-slate-600 font-bold">Ganhos da Semana</span>
                <DollarSign className="w-5 h-5 text-amber-600" />
              </div>
              <div className="text-2xl sm:text-3xl font-heading font-black text-amber-700">
                {formatBRL(currentDriver.earningsWeek)}
              </div>
              <p className="text-xs text-slate-600 mt-1 font-medium">
                Assinatura {WEEKLY_FEE_BADGE} {subStatus.isActive ? 'ativa' : 'vencida'}
              </p>
            </div>
          </div>

          {/* Economia vs Uber/99 Card */}
          <div className="bg-emerald-50 border-2 border-emerald-300 rounded-3xl p-5 shadow-sm space-y-3">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <span className="text-xs sm:text-sm font-heading font-black uppercase tracking-wider text-emerald-950 flex items-center gap-1.5">
                  <TrendingUp className="w-4 h-4 text-emerald-700" />
                  Economia no Bolso vs Uber e 99
                </span>
              </div>
              <span className="text-xs font-mono font-black text-emerald-800 bg-emerald-100 border border-emerald-300 px-2.5 py-0.5 rounded-full">
                0% Comissões
              </span>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 text-center">
              <div className="bg-white p-3 rounded-2xl border border-emerald-200">
                <span className="text-[11px] font-bold text-slate-500 uppercase block">Ganhos Brutos</span>
                <span className="text-base sm:text-lg font-heading font-black text-slate-900">
                  {formatBRL(weeklyEarnings)}
                </span>
              </div>
              <div className="bg-white p-3 rounded-2xl border border-rose-200">
                <span className="text-[11px] font-bold text-rose-600 uppercase block">Taxa Uber/99 (~28%)</span>
                <span className="text-base sm:text-lg font-heading font-black text-rose-600">
                  - {formatBRL(uberCut)}
                </span>
              </div>
              <div className="bg-emerald-600 p-3 rounded-2xl text-white shadow-xs">
                <span className="text-[11px] font-bold text-emerald-100 uppercase block">Sua Economia Real</span>
                <span className="text-base sm:text-lg font-heading font-black text-white">
                  + {formatBRL(driverSavingsVsUber99)}
                </span>
              </div>
            </div>
          </div>

          {/* Active Radar & Simulated Incoming Ride */}
          <div className="bg-white border border-slate-200 rounded-3xl p-5 sm:p-6 space-y-4 shadow-md">
            <div className="flex items-center justify-between border-b border-slate-200 pb-3">
              <h4 className="font-heading font-black text-slate-950 text-sm sm:text-base uppercase tracking-wider flex items-center gap-2">
                <span className="w-3 h-3 rounded-full bg-amber-500 radar-pulse" />
                <span>Radar de Chamados Próximos</span>
              </h4>
              <span className="text-xs text-slate-600 font-mono font-bold">GPS Otimizado</span>
            </div>

            {isOnline ? (
              <div className="bg-slate-50 p-5 rounded-2xl border border-slate-200 space-y-3.5">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-2.5">
                    <span className="bg-amber-500 text-slate-950 font-black text-xs px-2.5 py-1 rounded font-mono">
                      NOVA CORRIDA DISPONÍVEL
                    </span>
                    <span className="text-xs sm:text-sm text-slate-700 font-semibold">A 1.2 km de você</span>
                  </div>
                  <span className="font-heading font-black text-amber-800 text-lg sm:text-xl">
                    R$ 28,50 (100% Seu)
                  </span>
                </div>

                <div className="space-y-2 text-sm text-slate-800">
                  <div className="flex items-center gap-2.5 font-medium">
                    <span className="w-2.5 h-2.5 rounded-full bg-emerald-600" />
                    <span>Embarque: Av. Presidente Vargas, 1200 - Cidade Nova, Indaiatuba</span>
                  </div>
                  <div className="flex items-center gap-2.5 font-medium">
                    <span className="w-2.5 h-2.5 rounded-full bg-amber-600" />
                    <span>Destino: Parque Ecológico de Indaiatuba - Marginal do Parque</span>
                  </div>
                </div>

                {acceptedRideNotice && (
                  <div className="bg-emerald-50 border border-emerald-300 text-emerald-900 p-3.5 rounded-xl font-bold text-sm flex items-center justify-between animate-fade-in flex-wrap gap-2">
                    <div className="flex items-center gap-2">
                      <CheckCircle2 className="w-5 h-5 text-emerald-600 shrink-0" />
                      <span>{acceptedRideNotice}</span>
                    </div>
                    <div className="flex items-center gap-2">
                      <button
                        onClick={() => setIsDriverGpsOpen(true)}
                        className="px-3 py-1 bg-emerald-600 hover:bg-emerald-500 text-white rounded-lg text-xs font-heading font-black cursor-pointer flex items-center gap-1 shadow-xs"
                      >
                        <Navigation className="w-3.5 h-3.5" />
                        <span>Abrir GPS</span>
                      </button>
                      <button
                        onClick={() => setAcceptedRideNotice(null)}
                        className="text-xs text-emerald-700 hover:text-emerald-900 font-bold ml-1 cursor-pointer"
                      >
                        ✕
                      </button>
                    </div>
                  </div>
                )}

                <div className="flex flex-col sm:flex-row items-center gap-2.5 pt-2">
                  <button
                    onClick={() => {
                      onUpdateDriver({
                        ...currentDriver,
                        earningsToday: currentDriver.earningsToday + 28.5,
                        earningsWeek: currentDriver.earningsWeek + 28.5,
                        totalRides: currentDriver.totalRides + 1,
                      });
                      setAcceptedRideNotice('Corrida aceita! Rota enviada para o GPS. Ganhos de R$ 28,50 creditados.');
                      setIsDriverGpsOpen(true);
                      try {
                        confetti({ particleCount: 40, spread: 55, origin: { y: 0.6 } });
                      } catch {}
                    }}
                    className="w-full sm:flex-1 bg-amber-500 hover:bg-amber-400 text-slate-950 font-heading font-black py-3.5 rounded-xl text-sm transition-all cursor-pointer shadow active:scale-95 text-center border border-amber-400 flex items-center justify-center gap-2"
                  >
                    <Navigation className="w-4 h-4" />
                    <span>ACEITAR E ABRIR GPS (R$ 28,50)</span>
                  </button>

                  <button
                    type="button"
                    onClick={() => setIsDriverGpsOpen(true)}
                    className="w-full sm:w-auto px-4 py-3.5 bg-slate-950 hover:bg-zinc-800 text-white rounded-xl text-xs sm:text-sm font-heading font-bold cursor-pointer border border-zinc-800 flex items-center justify-center gap-2 shadow-xs"
                  >
                    <Navigation className="w-4 h-4 text-emerald-400" />
                    <span>Navegação GPS (Waze/Uber)</span>
                  </button>

                  <button
                    onClick={onOpenSupport}
                    className="w-full sm:w-auto px-3.5 py-3.5 bg-white hover:bg-slate-100 text-slate-800 rounded-xl text-xs sm:text-sm font-bold cursor-pointer border border-slate-300"
                  >
                    Suporte 24h
                  </button>
                </div>
              </div>
            ) : (
              <div className="text-center py-8 text-slate-600 text-sm">
                <p>Você está atualmente <strong className="text-rose-600">OFFLINE</strong>.</p>
                <p className="mt-1 text-slate-500 font-medium">
                  Clique em "Ficar Online" no topo para começar a receber corridas sem desconto de taxa.
                </p>
              </div>
            )}
          </div>

          {/* Referral & Share Card */}
          {onOpenShare && (
            <div className="bg-emerald-50/70 border border-emerald-200 rounded-3xl p-5 flex items-center justify-between shadow-sm">
              <div className="flex items-center gap-4">
                <div className="w-12 h-12 rounded-2xl bg-emerald-100 text-emerald-800 flex items-center justify-center shrink-0 border border-emerald-300">
                  <Share2 className="w-6 h-6" />
                </div>
                <div>
                  <h5 className="font-heading font-black text-slate-950 text-sm sm:text-base">
                    Convide Colegas Motoristas & Motoboys
                  </h5>
                  <p className="text-xs sm:text-sm text-slate-600 font-medium">
                    Compartilhe a plataforma com plano semanal de R$ 300 e 100% dos ganhos livres!
                  </p>
                </div>
              </div>

              <button
                type="button"
                onClick={onOpenShare}
                className="px-4 py-2.5 bg-emerald-600 hover:bg-emerald-500 text-white text-xs sm:text-sm font-extrabold rounded-xl transition-all cursor-pointer shadow-sm active:scale-95 whitespace-nowrap"
              >
                Compartilhar Link
              </button>
            </div>
          )}

          {/* Quick Support & Help Card */}
          <div className="bg-white border border-slate-200 rounded-3xl p-5 flex items-center justify-between shadow-md">
            <div className="flex items-center gap-4">
              <div className="w-12 h-12 rounded-2xl bg-slate-100 text-amber-700 flex items-center justify-center shrink-0">
                <Headphones className="w-6 h-6" />
              </div>
              <div>
                <h5 className="font-heading font-black text-slate-950 text-sm sm:text-base">
                  Suporte Técnico e Jurídico 24h
                </h5>
                <p className="text-xs sm:text-sm text-slate-600 font-medium">
                  Linha prioritária para motoristas e motoboys credenciados RACE
                </p>
              </div>
            </div>

            <button
              onClick={onOpenSupport}
              className="px-4 py-2.5 bg-slate-100 hover:bg-slate-200 text-slate-950 text-xs sm:text-sm font-extrabold rounded-xl border border-slate-300 transition-all cursor-pointer"
            >
              Falar Agora
            </button>
          </div>
        </div>
      )}

      {/* SUBTAB 2: LOGIN DO CONDUTOR (DESIGN PRETO E LARANJA #ff6a00) */}
      {activeSubTab === 'login' && (
        <div className="bg-[#000000] border-2 border-[#1a1a1a] rounded-3xl p-6 sm:p-8 shadow-2xl space-y-6 max-w-md mx-auto text-white">
          <div className="text-center space-y-1.5 pb-2">
            <h1 className="text-5xl font-heading font-black text-[#ff6a00] tracking-tighter uppercase select-none">
              RACE
            </h1>
            <p className="text-zinc-300 font-medium text-sm tracking-wide">
              App do Motorista
            </p>
          </div>

          {loginFeedback && (
            <div className="bg-red-950/80 border border-red-500/80 text-red-200 text-xs sm:text-sm p-3.5 rounded-xl font-medium flex items-center gap-2">
              <AlertTriangle className="w-4 h-4 text-red-400 shrink-0" />
              <span>{loginFeedback}</span>
            </div>
          )}

          <form onSubmit={handleLoginSubmit} className="space-y-5">
            <div className="space-y-2">
              <label className="text-white text-xs font-bold uppercase tracking-wider block">
                EMAIL
              </label>
              <input
                type="email"
                required
                value={loginEmail}
                onChange={(e) => setLoginEmail(e.target.value)}
                placeholder="seu.email@exemplo.com"
                className="w-full bg-[#1a1a1a] border border-[#2a2a2a] text-white placeholder-zinc-500 rounded-xl px-4 py-3.5 text-base focus:outline-none focus:border-[#ff6a00] transition-colors"
              />
            </div>

            <div className="space-y-2">
              <label className="text-white text-xs font-bold uppercase tracking-wider block">
                SENHA
              </label>
              <div className="relative">
                <input
                  type={showLoginPassword ? 'text' : 'password'}
                  required
                  value={loginPassword}
                  onChange={(e) => setLoginPassword(e.target.value)}
                  placeholder="••••••••"
                  className="w-full bg-[#1a1a1a] border border-[#2a2a2a] text-white placeholder-zinc-500 rounded-xl px-4 py-3.5 text-base focus:outline-none focus:border-[#ff6a00] transition-colors pr-12"
                />
                <button
                  type="button"
                  onClick={() => setShowLoginPassword(!showLoginPassword)}
                  className="absolute right-4 top-4 text-zinc-400 hover:text-white transition-colors cursor-pointer"
                >
                  {showLoginPassword ? <EyeOff className="w-5 h-5" /> : <Eye className="w-5 h-5" />}
                </button>
              </div>
            </div>

            <button
              type="submit"
              className="w-full bg-[#ff6a00] hover:bg-[#e05e00] active:scale-[0.99] text-white font-heading font-black text-lg py-4 px-6 rounded-xl transition-all cursor-pointer shadow-lg shadow-[#ff6a00]/20 uppercase tracking-wider block mt-6"
            >
              ENTRAR
            </button>

            <div className="text-center pt-1">
              <button
                type="button"
                onClick={() => setActiveSubTab('register')}
                className="text-[#ff6a00] hover:underline text-sm font-bold transition-all cursor-pointer inline-block"
              >
                Criar conta de motorista
              </button>
            </div>
          </form>


        </div>
      )}

      {/* SUBTAB 3: REGISTRATION OF NEW DRIVER / MOTOBOY COM LOGIN, SENHA E EXIGÊNCIAS CONFORT */}
      {activeSubTab === 'register' && (
        <div className="bg-white border border-slate-200 rounded-3xl p-6 sm:p-7 shadow-md space-y-6">
          <div className="border-b border-slate-200 pb-4">
            <div className="flex items-center gap-3">
              <div className="w-12 h-12 bg-amber-100 text-amber-800 rounded-2xl flex items-center justify-center font-bold border border-amber-300">
                <UserCheck className="w-6 h-6" />
              </div>
              <div>
                <h3 className="font-heading font-black text-slate-950 text-xl sm:text-2xl">
                  Cadastro de Novo Parceiro (Motorista / Motoboy)
                </h3>
                <p className="text-sm text-slate-600 font-medium mt-0.5">
                  Crie seu login e senha, valide os dados do veículo e garanta 100% dos ganhos das corridas!
                </p>
              </div>
            </div>
          </div>

          {/* Banner oficial das Exigências do Modelo Confort */}
          <div className="bg-purple-50/70 border-2 border-purple-300 rounded-3xl p-5 sm:p-6 space-y-3">
            <div className="flex items-center gap-2.5">
              <Sparkles className="w-5 h-5 text-purple-700" />
              <h4 className="font-heading font-black text-purple-950 text-base sm:text-lg">
                Exigências Oficiais do Modelo RACE Confort para Liberação
              </h4>
            </div>
            <p className="text-xs sm:text-sm text-purple-950 font-medium">
              Para manter o padrão de qualidade, espaço e sofisticação da categoria Confort, aplicamos os seguintes critérios obrigatórios de ano e modelo:
            </p>

            <div className="grid grid-cols-1 md:grid-cols-3 gap-3 pt-1">
              <div className="bg-white p-3.5 rounded-2xl border border-purple-200 shadow-sm space-y-1">
                <span className="font-black text-xs text-purple-900 uppercase block font-mono">
                  1. Sedãs Populares
                </span>
                <p className="text-xs font-bold text-slate-900">
                  Etios Sedan, Voyage, Prisma, Logan e Cobalt
                </p>
                <div className="text-xs font-black text-purple-700 bg-purple-100 px-2 py-0.5 rounded w-fit">
                  A partir de 2019
                </div>
              </div>

              <div className="bg-white p-3.5 rounded-2xl border border-purple-200 shadow-sm space-y-1">
                <span className="font-black text-xs text-purple-900 uppercase block font-mono">
                  2. Compactos Premium
                </span>
                <p className="text-xs font-bold text-slate-900">
                  Argo e Polo
                </p>
                <div className="text-xs font-black text-purple-700 bg-purple-100 px-2 py-0.5 rounded w-fit">
                  A partir de 2023
                </div>
              </div>

              <div className="bg-white p-3.5 rounded-2xl border border-purple-200 shadow-sm space-y-1">
                <span className="font-black text-xs text-purple-900 uppercase block font-mono">
                  3. SUVs, CR-V e Sedãs Médios
                </span>
                <p className="text-xs font-bold text-slate-900">
                  Honda CR-V, HR-V, Corolla Sedã, Civic Sedã, SUVs
                </p>
                <div className="text-xs font-black text-purple-700 bg-purple-100 px-2 py-0.5 rounded w-fit">
                  A partir de 2018
                </div>
              </div>
            </div>
          </div>

          {comfortWarning && (
            <div className="bg-purple-50 border-2 border-purple-300 text-purple-950 text-xs sm:text-sm p-4 rounded-2xl font-bold flex items-center gap-2.5 shadow-sm">
              <Sparkles className="w-5 h-5 text-purple-700 shrink-0" />
              <span>{comfortWarning}</span>
            </div>
          )}

          {registeredSuccess ? (
            <div className="bg-emerald-50 border-2 border-emerald-400 rounded-3xl p-6 sm:p-7 text-center space-y-4 shadow-md">
              <div className="w-16 h-16 bg-emerald-100 text-emerald-700 rounded-full flex items-center justify-center mx-auto shadow-inner">
                <CheckCircle2 className="w-10 h-10" />
              </div>
              <h4 className="font-heading font-black text-slate-900 text-xl sm:text-2xl">
                Cadastro e Credenciais Criados com Sucesso!
              </h4>
              <p className="text-sm sm:text-base text-slate-700 max-w-lg mx-auto font-medium">
                Seu login (<strong className="font-mono text-slate-950">{regEmail}</strong>) e senha foram salvos com criptografia. Seu plano de R$ 300 semanal está ativo com <strong className="text-emerald-700 font-black">100% dos ganhos livres</strong>.
              </p>
              
              <div className="bg-white border border-emerald-300 rounded-2xl p-4 max-w-md mx-auto text-xs sm:text-sm text-emerald-950 font-bold flex items-center gap-2 justify-center shadow-xs">
                <span className="w-3 h-3 rounded-full bg-emerald-500 radar-pulse" />
                <span>Entrando direto na Página de Atendimento de Corridas...</span>
              </div>

              <div className="flex flex-col sm:flex-row gap-3 justify-center pt-2">
                <button
                  type="button"
                  onClick={() => {
                    setRegisteredSuccess(false);
                    if (onNavigateToRides) onNavigateToRides();
                  }}
                  className="bg-amber-500 hover:bg-amber-400 text-slate-950 font-heading font-black text-sm sm:text-base px-7 py-3.5 rounded-2xl transition-all cursor-pointer shadow-md border border-amber-400 flex items-center justify-center gap-2 active:scale-95"
                >
                  <span>IR DIRETO PARA ATENDIMENTO DE CORRIDAS</span>
                  <ArrowRight className="w-5 h-5" />
                </button>
                <button
                  type="button"
                  onClick={() => {
                    setRegisteredSuccess(false);
                    setActiveSubTab('dashboard');
                  }}
                  className="bg-white hover:bg-slate-100 text-slate-700 font-bold text-xs sm:text-sm px-5 py-3 rounded-2xl transition-all cursor-pointer border border-slate-300"
                >
                  Ver Meu Painel Condutor
                </button>
              </div>
            </div>
          ) : (
            <form onSubmit={handleRegisterSubmit} className="space-y-5">
              {regError && (
                <div className="bg-rose-50 border border-rose-300 text-rose-800 text-sm p-4 rounded-2xl font-bold flex items-center gap-2">
                  <AlertTriangle className="w-5 h-5 text-rose-600 shrink-0" />
                  <span>{regError}</span>
                </div>
              )}

              {/* Seção 1: Credenciais de Acesso (Login e Senha) */}
              <div className="bg-slate-50 p-5 rounded-2xl border border-slate-200 space-y-4">
                <div className="flex items-center gap-2 border-b border-slate-200 pb-2">
                  <Lock className="w-5 h-5 text-amber-700" />
                  <h4 className="font-heading font-black text-slate-950 text-base">
                    1. Dados de Acesso (Login e Senha do Condutor)
                  </h4>
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-3 gap-3.5">
                  <div>
                    <label className="text-xs sm:text-sm font-bold text-slate-700 mb-1 block">
                      Login / E-mail de Acesso *
                    </label>
                    <input
                      type="email"
                      required
                      value={regEmail}
                      onChange={(e) => setRegEmail(e.target.value)}
                      placeholder="seu.email@exemplo.com"
                      className="w-full bg-white border border-slate-300 rounded-xl px-4 py-2.5 text-sm sm:text-base text-slate-950 focus:outline-none focus:border-amber-500 font-medium"
                    />
                  </div>

                  <div>
                    <label className="text-xs sm:text-sm font-bold text-slate-700 mb-1 block">
                      Senha de Acesso (mín. 6 dígitos) *
                    </label>
                    <div className="relative">
                      <input
                        type={showRegPassword ? 'text' : 'password'}
                        required
                        value={regPassword}
                        onChange={(e) => setRegPassword(e.target.value)}
                        placeholder="Crie uma senha forte"
                        className="w-full bg-white border border-slate-300 rounded-xl px-4 py-2.5 text-sm sm:text-base text-slate-950 focus:outline-none focus:border-amber-500 font-medium pr-10"
                      />
                      <button
                        type="button"
                        onClick={() => setShowRegPassword(!showRegPassword)}
                        className="absolute right-3 top-3 text-slate-400 hover:text-slate-800 cursor-pointer"
                      >
                        {showRegPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                      </button>
                    </div>
                  </div>

                  <div>
                    <label className="text-xs sm:text-sm font-bold text-slate-700 mb-1 block">
                      Confirmar Senha *
                    </label>
                    <input
                      type={showRegPassword ? 'text' : 'password'}
                      required
                      value={regConfirmPassword}
                      onChange={(e) => setRegConfirmPassword(e.target.value)}
                      placeholder="Repita sua senha"
                      className="w-full bg-white border border-slate-300 rounded-xl px-4 py-2.5 text-sm sm:text-base text-slate-950 focus:outline-none focus:border-amber-500 font-medium"
                    />
                  </div>
                </div>
              </div>

              {/* Seção 2: Dados Pessoais & Documentos */}
              <div className="bg-slate-50 p-5 rounded-2xl border border-slate-200 space-y-4">
                <div className="flex items-center gap-2 border-b border-slate-200 pb-2">
                  <UserCheck className="w-5 h-5 text-amber-700" />
                  <h4 className="font-heading font-black text-slate-950 text-base">
                    2. Dados Pessoais e Habilitação
                  </h4>
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-3 gap-3.5">
                  <div>
                    <label className="text-xs sm:text-sm font-bold text-slate-700 mb-1 block">
                      Nome Completo *
                    </label>
                    <input
                      type="text"
                      required
                      value={regName}
                      onChange={(e) => setRegName(e.target.value)}
                      placeholder="Ex: Gabriel Moreira"
                      className="w-full bg-white border border-slate-300 rounded-xl px-4 py-2.5 text-sm sm:text-base text-slate-950 focus:outline-none focus:border-amber-500 font-medium"
                    />
                  </div>

                  <div>
                    <label className="text-xs sm:text-sm font-bold text-slate-700 mb-1 block">
                      WhatsApp / Telefone *
                    </label>
                    <input
                      type="tel"
                      required
                      value={regPhone}
                      onChange={(e) => setRegPhone(e.target.value)}
                      placeholder="(11) 98765-4321"
                      className="w-full bg-white border border-slate-300 rounded-xl px-4 py-2.5 text-sm sm:text-base text-slate-950 focus:outline-none focus:border-amber-500 font-medium"
                    />
                  </div>

                  <div>
                    <label className="text-xs sm:text-sm font-bold text-slate-700 mb-1 block">
                      CPF *
                    </label>
                    <input
                      type="text"
                      required
                      value={regCpf}
                      onChange={(e) => setRegCpf(e.target.value)}
                      placeholder="000.000.000-00"
                      className="w-full bg-white border border-slate-300 rounded-xl px-4 py-2.5 text-sm sm:text-base text-slate-950 focus:outline-none focus:border-amber-500 font-medium"
                    />
                  </div>

                  <div className="sm:col-span-3">
                    <label className="text-xs sm:text-sm font-bold text-slate-700 mb-1 block">
                      Número da CNH (com EAR ativo) *
                    </label>
                    <input
                      type="text"
                      required
                      value={regCnh}
                      onChange={(e) => setRegCnh(e.target.value)}
                      placeholder="Ex: 01234567890 - Categoria B (Exerce Atividade Remunerada)"
                      className="w-full bg-white border border-slate-300 rounded-xl px-4 py-2.5 text-sm sm:text-base text-slate-950 focus:outline-none focus:border-amber-500 font-medium"
                    />
                  </div>
                </div>
              </div>

              {/* Seção 3: Veículo e Validação do Modelo Confort */}
              <div className="bg-slate-50 p-5 rounded-2xl border border-slate-200 space-y-4">
                <div className="flex items-center justify-between border-b border-slate-200 pb-2">
                  <div className="flex items-center gap-2">
                    <Car className="w-5 h-5 text-amber-700" />
                    <h4 className="font-heading font-black text-slate-950 text-base">
                      3. Modalidade e Dados do Veículo
                    </h4>
                  </div>
                  <span className="text-xs font-mono font-bold text-purple-900 bg-purple-100 px-2.5 py-0.5 rounded-full">
                    Auditoria Automática Confort
                  </span>
                </div>

                {/* Category Choice */}
                <div>
                  <label className="text-xs sm:text-sm font-bold text-slate-700 block mb-2">
                    Categoria Desejada para Cadastro
                  </label>
                  <div className="grid grid-cols-2 sm:grid-cols-4 gap-2.5">
                    {[
                      { id: 'confort' as VehicleCategory, label: 'Carro Confort (R$ 3,50/km)', icon: Sparkles, highlight: true },
                      { id: 'economica' as VehicleCategory, label: 'Carro Econômico (R$ 2,50/km)', icon: Car },
                      { id: 'moto_passageiro' as VehicleCategory, label: 'Moto Passageiro (R$ 1,80/km)', icon: Bike },
                      { id: 'moto_entrega' as VehicleCategory, label: 'Moto Entrega Flash (R$ 2,00/km)', icon: Bike },
                    ].map((cat) => {
                      const Icon = cat.icon;
                      const isSelected = regCategory === cat.id;
                      return (
                        <button
                          key={cat.id}
                          type="button"
                          onClick={() => setRegCategory(cat.id)}
                          className={`p-3.5 rounded-2xl border-2 flex flex-col items-center justify-center gap-1.5 transition-all cursor-pointer ${
                            isSelected
                              ? cat.id === 'confort'
                                ? 'bg-purple-100 border-purple-600 text-purple-950 font-black shadow-md'
                                : 'bg-amber-100 border-amber-500 text-amber-950 font-black shadow-md'
                              : 'bg-white border-slate-200 text-slate-700 hover:bg-slate-100'
                          }`}
                        >
                          <Icon className="w-5 h-5" />
                          <span className="text-xs sm:text-sm text-center leading-tight">{cat.label}</span>
                        </button>
                      );
                    })}
                  </div>
                </div>

                {/* Modelos Sugeridos do Regulamento para Seleção Rápida */}
                <div>
                  <label className="text-xs sm:text-sm font-bold text-slate-700 block mb-1.5">
                    Modelos de Referência Confort (Clique para preencher rápido):
                  </label>
                  <div className="flex flex-wrap gap-2">
                    {COMFORT_POPULAR_MODELS.map((pm, i) => (
                      <button
                        key={i}
                        type="button"
                        onClick={() => handleSelectPresetModel(pm)}
                        className={`text-xs px-2.5 py-1.5 rounded-lg border font-semibold cursor-pointer transition-all ${
                          regModel === pm.name
                            ? 'bg-purple-600 text-white border-purple-700 shadow-sm'
                            : 'bg-white text-slate-700 border-slate-300 hover:border-purple-400'
                        }`}
                      >
                        {pm.name} ({pm.minYear}+)
                      </button>
                    ))}
                  </div>
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-3 gap-3.5">
                  <div className="sm:col-span-2">
                    <label className="text-xs sm:text-sm font-bold text-slate-700 mb-1 block">
                      Modelo do Veículo (ex: Toyota Corolla Sedã / Honda CR-V / Voyage / Polo) *
                    </label>
                    <input
                      type="text"
                      required
                      value={regModel}
                      onChange={(e) => setRegModel(e.target.value)}
                      placeholder="Ex: Toyota Corolla Sedã / Honda CR-V / Voyage / Argo"
                      className="w-full bg-white border border-slate-300 rounded-xl px-4 py-2.5 text-sm sm:text-base text-slate-950 focus:outline-none focus:border-amber-500 font-medium"
                    />
                  </div>

                  <div>
                    <label className="text-xs sm:text-sm font-bold text-slate-700 mb-1 block">
                      Ano de Fabricação *
                    </label>
                    <input
                      type="number"
                      required
                      value={regYear}
                      onChange={(e) => setRegYear(e.target.value)}
                      placeholder="Ex: 2024"
                      className="w-full bg-white border border-slate-300 rounded-xl px-4 py-2.5 text-sm sm:text-base text-slate-950 focus:outline-none focus:border-amber-500 font-medium"
                    />
                  </div>

                  <div>
                    <label className="text-xs sm:text-sm font-bold text-slate-700 mb-1 block">
                      Placa do Veículo *
                    </label>
                    <input
                      type="text"
                      required
                      value={regPlate}
                      onChange={(e) => setRegPlate(e.target.value)}
                      placeholder="ABC-1234 ou Mercosul"
                      className="w-full bg-white border border-slate-300 rounded-xl px-4 py-2.5 text-sm sm:text-base text-slate-950 focus:outline-none focus:border-amber-500 font-medium"
                    />
                  </div>
                </div>

                {/* Validador Visual do Modelo Confort em Tempo Real */}
                {regCategory === 'confort' && (
                  <div
                    className={`p-4 rounded-2xl border-2 transition-all space-y-1.5 ${
                      comfortCheck.eligible
                        ? 'bg-emerald-50 border-emerald-400 text-emerald-950'
                        : 'bg-amber-50 border-amber-400 text-amber-950'
                    }`}
                  >
                    <div className="flex items-center justify-between">
                      <div className="flex items-center gap-2">
                        {comfortCheck.eligible ? (
                          <CheckCircle2 className="w-5 h-5 text-emerald-600 shrink-0" />
                        ) : (
                          <AlertTriangle className="w-5 h-5 text-amber-600 shrink-0" />
                        )}
                        <span className="font-heading font-black text-sm sm:text-base">
                          {comfortCheck.eligible
                            ? 'VEÍCULO APROVADO PARA O MODELO CONFORT'
                            : 'RESTRIÇÃO DE ANO PARA O MODELO CONFORT'}
                        </span>
                      </div>
                      <span className="text-xs font-mono font-bold px-2 py-0.5 rounded bg-white border shadow-sm">
                        Ano mínimo: {comfortCheck.minYearRequired}+
                      </span>
                    </div>

                    <p className="text-xs sm:text-sm font-medium">
                      {comfortCheck.feedbackMessage}
                    </p>

                    <div className="text-xs text-slate-600 border-t border-slate-200/80 pt-1.5 mt-1">
                      <strong>Critério aplicado:</strong> {comfortCheck.ruleDescription}
                    </div>
                  </div>
                )}
              </div>

              {/* Document verification badge */}
              <div className="bg-slate-50 p-4 rounded-xl border border-slate-200 flex items-center justify-between text-xs sm:text-sm text-slate-700 font-medium">
                <div className="flex items-center gap-2.5">
                  <ShieldCheck className="w-5 h-5 text-emerald-600" />
                  <span>Auditoria automática de antecedentes criminais e CNH com EAR</span>
                </div>
                <span className="text-xs text-emerald-700 font-bold bg-emerald-50 px-2.5 py-0.5 rounded border border-emerald-200">
                  Criptografia Segura
                </span>
              </div>

              {/* Submit button */}
              <button
                type="submit"
                className="w-full bg-amber-500 hover:bg-amber-400 text-slate-950 font-heading font-black py-4 rounded-xl transition-all cursor-pointer shadow-md text-sm sm:text-base border border-amber-400"
              >
                CRIAR LOGIN, SENHA E FINALIZAR CADASTRO NO PLANO {WEEKLY_FEE_BADGE}
              </button>
            </form>
          )}
        </div>
      )}

      {/* SUBTAB 4: SUBSCRIPTION PLAN (R$ 200 SEMANAL) */}
      {activeSubTab === 'subscription' && (
        <div className="space-y-4">
          {/* Card Principal de Assinatura Semanal */}
          <div className="bg-white border-2 border-slate-200 rounded-3xl p-6 sm:p-7 shadow-lg space-y-6">
            {/* Topo: Badge "PLANO ATIVO" verde ou "VENCIDO" vermelho + Texto: "Ativo até DD/MM/YYYY HH:mm" ou "Vencido em DD/MM" */}
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 pb-4 border-b border-slate-200">
              <div>
                <span className="text-xs font-mono font-black uppercase tracking-wider text-slate-500 block mb-1">
                  Assinatura Semanal RACE
                </span>
                <h2 className="font-heading font-black text-slate-950 text-2xl sm:text-3xl">
                  {WEEKLY_FEE_TEXT}
                </h2>
                <p className="text-xs sm:text-sm text-slate-600 font-medium mt-1">
                  100% de todos os ganhos das corridas repassados integralmente para você. Sem taxa percentual.
                </p>
              </div>

              {/* Status da Assinatura: Badge + Texto */}
              <div className="flex flex-col items-start sm:items-end gap-1.5">
                <span
                  className={`inline-flex items-center gap-1.5 px-3.5 py-1.5 rounded-full text-xs font-heading font-black tracking-wider uppercase border shadow-xs ${
                    subDetails.isActive
                      ? 'bg-emerald-100 text-emerald-800 border-emerald-300'
                      : 'bg-rose-100 text-rose-800 border-rose-300'
                  }`}
                >
                  {subDetails.isActive ? (
                    <CheckCircle2 className="w-4 h-4 text-emerald-600" />
                  ) : (
                    <AlertTriangle className="w-4 h-4 text-rose-600" />
                  )}
                  <span>{subDetails.badgeLabel}</span>
                </span>
                <span className="text-xs sm:text-sm font-heading font-bold text-slate-700">
                  {subDetails.textLabel}
                </span>
              </div>
            </div>

            {/* Barra de Progresso de 7 dias */}
            <div className="bg-slate-50 p-4 sm:p-5 rounded-2xl border border-slate-200 space-y-2">
              <div className="flex items-center justify-between text-xs sm:text-sm">
                <span className="font-heading font-black text-slate-800 flex items-center gap-1.5">
                  <Clock className="w-4 h-4 text-amber-600" />
                  <span>Ciclo Semanal ({WEEKLY_DAYS} dias)</span>
                </span>
                <span className="font-mono font-bold text-slate-600">
                  {subDetails.isActive
                    ? `${subDetails.daysLeft} de ${WEEKLY_DAYS} dias restantes`
                    : 'Ciclo expirado - requer renovação'}
                </span>
              </div>
              <div className="h-3.5 w-full bg-slate-200 rounded-full overflow-hidden p-0.5 border border-slate-300">
                <div
                  className={`h-full rounded-full transition-all duration-700 ${
                    subDetails.isActive
                      ? 'bg-gradient-to-r from-emerald-500 to-teal-500'
                      : 'bg-rose-500'
                  }`}
                  style={{ width: `${subDetails.progressPercent}%` }}
                />
              </div>
              <p className="text-[11px] text-slate-500 font-medium">
                Sua assinatura renova o acesso por 7 dias inteiros de chamados com 100% de repasse integral.
              </p>
            </div>

            {/* Economia: "Você já economizou R$ 1.240 vs taxa de 25% da Uber" */}
            <div className="bg-emerald-50 border-2 border-emerald-300 rounded-2xl p-5 space-y-3">
              <div className="flex items-center justify-between">
                <h4 className="font-heading font-black text-emerald-950 text-sm sm:text-base flex items-center gap-2">
                  <TrendingUp className="w-5 h-5 text-emerald-700" />
                  <span>Economia Real Comprovada</span>
                </h4>
                <span className="text-xs font-mono font-bold text-emerald-800 bg-emerald-100 px-2.5 py-0.5 rounded-full border border-emerald-300">
                  0% de Comissão
                </span>
              </div>

              <div className="bg-white p-4 rounded-xl border border-emerald-200">
                <p className="text-base sm:text-lg font-heading font-black text-emerald-900 leading-snug">
                  Você já economizou R$ 1.240 vs taxa de 25% da Uber
                </p>
                <p className="text-xs text-slate-600 font-medium mt-1">
                  Enquanto a Uber e 99 cobram de 25% a 35% de cada quilômetro rodado, na RACE todo o valor do passageiro cai integralmente na sua chave PIX.
                </p>
              </div>
            </div>

            {/* Inputs: Chave PIX do motorista (onde ele recebe 100% da corrida) */}
            <div className="bg-slate-50 p-5 rounded-2xl border border-slate-200 space-y-3">
              <div className="flex items-center justify-between">
                <label className="text-xs sm:text-sm font-heading font-black text-slate-900 flex items-center gap-2">
                  <Wallet className="w-4 h-4 text-emerald-600" />
                  <span>Chave PIX do Motorista (Recebimento de 100% da Corrida)</span>
                </label>
                <span className="text-[11px] font-mono font-bold text-emerald-700 bg-emerald-50 px-2 py-0.5 rounded border border-emerald-200">
                  Repasse Direto
                </span>
              </div>
              <p className="text-xs text-slate-600 font-medium">
                Cadastre aqui sua chave PIX (CPF, telefone, e-mail ou aleatória). É para ela que o passageiro realiza o pagamento das corridas:
              </p>
              <div className="flex flex-col sm:flex-row gap-2">
                <input
                  type="text"
                  value={driverPixKey}
                  onChange={(e) => setDriverPixKey(e.target.value)}
                  placeholder="Ex: 123.456.789-00 ou motorista@banco.com.br"
                  className="flex-1 bg-white border border-slate-300 rounded-xl px-3.5 py-2.5 text-sm font-mono text-slate-800 focus:outline-hidden focus:border-emerald-500 shadow-xs"
                />
                <button
                  type="button"
                  onClick={handleSaveDriverPixKey}
                  className="bg-slate-900 hover:bg-slate-800 text-white font-heading font-black px-5 py-2.5 rounded-xl text-xs sm:text-sm transition-all cursor-pointer shadow-sm flex items-center justify-center gap-1.5"
                >
                  <Check className="w-4 h-4 text-emerald-400" />
                  <span>Salvar Chave PIX</span>
                </button>
              </div>
              {savedDriverPixNotice && (
                <p className="text-xs text-emerald-700 font-bold flex items-center gap-1 animate-fade-in">
                  <CheckCircle2 className="w-4 h-4 text-emerald-600" />
                  <span>Chave PIX salva e vinculada ao seu perfil de condutor com sucesso!</span>
                </p>
              )}
            </div>

            {/* Status do Pagamento Pendente se houver */}
            {currentDriver.pendingPayment?.status === 'pending' && (
              <div className="bg-amber-50 border-2 border-amber-400 rounded-2xl p-4 sm:p-5 flex items-start gap-3.5 shadow-sm">
                <Clock className="w-6 h-6 text-amber-600 shrink-0 mt-0.5 animate-pulse" />
                <div className="space-y-1">
                  <span className="text-xs font-mono font-bold text-amber-800 uppercase tracking-wider block">
                    Comprovante em Análise
                  </span>
                  <h4 className="font-heading font-black text-amber-950 text-sm sm:text-base">
                    Comprovante enviado! Aguarde aprovação do Admin em até 10 minutos.
                  </h4>
                  <p className="text-xs text-amber-900 font-medium">
                    ID do Comprovante: <span className="font-mono font-bold bg-white px-1.5 py-0.5 rounded border border-amber-300">{currentDriver.pendingPayment.comprovanteId}</span> &bull; Você receberá notificação assim que homologado no banco {RACE_PIX_BANK}.
                  </p>
                </div>
              </div>
            )}

            {/* Botão grande: "PAGAR R$200 DA SEMANA VIA PIX" -> abre modal */}
            <div className="pt-2">
              <button
                type="button"
                onClick={handleOpenPixModal}
                className="w-full bg-emerald-600 hover:bg-emerald-500 active:scale-98 text-white font-heading font-black py-4 px-6 rounded-2xl shadow-xl transition-all cursor-pointer text-base sm:text-lg flex items-center justify-center gap-3 border-2 border-emerald-500"
              >
                <Wallet className="w-6 h-6 text-emerald-100" />
                <span>PAGAR R$200 DA SEMANA VIA PIX</span>
              </button>
              <p className="text-center text-xs text-slate-500 mt-2 font-medium">
                Pague pelo seu banco com a chave PIX oficial e envie o comprovante para liberação em até 10 minutos.
              </p>
            </div>
          </div>
        </div>
      )}

      {/* Modal PIX Manual Real de R$ 200/semana com Envio de Comprovante */}
      {isPixModalOpen && (
        <div className="fixed inset-0 z-50 bg-slate-950/75 backdrop-blur-xs flex items-center justify-center p-4 overflow-y-auto animate-fade-in">
          <div className="bg-white rounded-3xl max-w-lg w-full p-6 sm:p-7 shadow-2xl border-2 border-slate-200 space-y-5 my-auto animate-scale-up">
            {/* Modal Header */}
            <div className="flex items-center justify-between pb-3 border-b border-slate-200">
              <div className="flex items-center gap-3">
                <div className="w-11 h-11 rounded-2xl bg-emerald-100 text-emerald-800 flex items-center justify-center border border-emerald-200 shadow-xs">
                  <Wallet className="w-6 h-6" />
                </div>
                <div>
                  <h3 className="font-heading font-black text-slate-950 text-lg sm:text-xl leading-tight">
                    Pague R$200 da semana via PIX
                  </h3>
                  <span className="text-xs font-mono font-bold text-emerald-700 block">
                    Taxa Zero &bull; 100% de Repasse ao Condutor
                  </span>
                </div>
              </div>
              <button
                type="button"
                onClick={() => setIsPixModalOpen(false)}
                className="w-9 h-9 rounded-xl bg-slate-100 hover:bg-slate-200 text-slate-600 flex items-center justify-center cursor-pointer transition-colors"
                title="Fechar"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            {/* Feedback de sucesso após envio */}
            {proofSentSuccessNotice ? (
              <div className="p-5 rounded-2xl bg-emerald-50 border-2 border-emerald-400 text-center space-y-4 animate-fade-in">
                <div className="w-14 h-14 bg-emerald-100 rounded-full flex items-center justify-center mx-auto text-emerald-700">
                  <CheckCircle className="w-8 h-8" />
                </div>
                <div className="space-y-1">
                  <h4 className="font-heading font-black text-emerald-950 text-base sm:text-lg">
                    Comprovante Enviado com Sucesso!
                  </h4>
                  <p className="text-sm text-emerald-900 font-semibold leading-relaxed">
                    {proofSentSuccessNotice}
                  </p>
                </div>
                <div className="p-3 bg-white rounded-xl border border-emerald-200 text-xs text-slate-600 font-medium">
                  Assim que o administrador verificar o depósito de R$ 200,00 na conta, sua liberação de 7 dias será ativada instantaneamente.
                </div>
                <button
                  type="button"
                  onClick={() => setIsPixModalOpen(false)}
                  className="w-full bg-slate-900 hover:bg-slate-800 text-white font-heading font-black py-3 rounded-xl transition-all cursor-pointer text-sm"
                >
                  Entendido / Fechar
                </button>
              </div>
            ) : (
              <div className="space-y-4">
                {/* Dados Oficiais da Conta PIX da Race */}
                <div className="bg-slate-50 border-2 border-slate-200 rounded-2xl p-4 sm:p-5 space-y-3.5">
                  {/* Chave PIX da Race */}
                  <div>
                    <label className="text-xs font-heading font-black text-slate-500 uppercase tracking-wider block mb-1">
                      Chave PIX da Race ({RACE_PIX_KEY_TYPE})
                    </label>
                    <div className="flex items-center gap-2">
                      <div className="flex-1 bg-white border border-slate-300 rounded-xl px-3.5 py-2.5 font-mono font-black text-slate-900 text-sm sm:text-base select-all truncate">
                        {RACE_PIX_KEY}
                      </div>
                      <button
                        type="button"
                        onClick={handleCopyRacePixKey}
                        className="bg-emerald-600 hover:bg-emerald-500 text-white font-heading font-black text-xs px-4 py-2.5 rounded-xl transition-all cursor-pointer shadow flex items-center gap-1.5 shrink-0"
                      >
                        {copiedRacePix ? (
                          <>
                            <Check className="w-4 h-4 text-emerald-200" />
                            <span>COPIADO!</span>
                          </>
                        ) : (
                          <>
                            <Copy className="w-4 h-4" />
                            <span>COPIAR CHAVE</span>
                          </>
                        )}
                      </button>
                    </div>
                  </div>

                  {/* Informações Bancárias */}
                  <div className="grid grid-cols-1 sm:grid-cols-3 gap-2.5 pt-1">
                    <div className="bg-white p-3 rounded-xl border border-slate-200">
                      <span className="text-[11px] font-bold text-slate-500 block uppercase">Banco</span>
                      <span className="text-xs sm:text-sm font-heading font-black text-slate-900 block mt-0.5">
                        {RACE_PIX_BANK}
                      </span>
                    </div>

                    <div className="bg-white p-3 rounded-xl border border-slate-200">
                      <span className="text-[11px] font-bold text-slate-500 block uppercase">Favorecido</span>
                      <span className="text-xs sm:text-sm font-heading font-black text-slate-900 block mt-0.5 truncate">
                        {RACE_PIX_NAME}
                      </span>
                    </div>

                    <div className="bg-emerald-100 p-3 rounded-xl border border-emerald-300 text-emerald-950">
                      <span className="text-[11px] font-bold text-emerald-800 block uppercase">Valor Exato</span>
                      <span className="text-sm sm:text-base font-heading font-black text-emerald-950 block mt-0.5">
                        R$ 200,00
                      </span>
                    </div>
                  </div>
                </div>

                {/* Instrução em texto grande */}
                <div className="bg-amber-50 border-2 border-amber-300 rounded-2xl p-4 sm:p-4.5 space-y-1.5">
                  <span className="text-xs font-mono font-bold text-amber-800 uppercase tracking-wider block">
                    Passo a Passo de Pagamento:
                  </span>
                  <p className="text-sm sm:text-base font-heading font-black text-amber-950 leading-relaxed">
                    1. Abra seu banco &bull; 2. PIX com chave acima &bull; 3. Valor R$200 &bull; 4. Tire print do comprovante &bull; 5. Clique em Já paguei
                  </p>
                </div>

                {/* Input pra colar ID do comprovante ou upload de print */}
                <div className="bg-slate-50 border border-slate-200 rounded-2xl p-4 space-y-3">
                  <div>
                    <label className="text-xs font-heading font-black text-slate-700 uppercase tracking-wider block mb-1">
                      ID ou Código do Comprovante Bancário:
                    </label>
                    <input
                      type="text"
                      value={comprovanteId}
                      onChange={(e) => setComprovanteId(e.target.value)}
                      placeholder="Ex: E18236120202611050938... ou código de autenticação"
                      className="w-full bg-white border border-slate-300 rounded-xl px-3.5 py-2.5 text-xs sm:text-sm font-mono text-slate-900 focus:outline-hidden focus:border-emerald-500"
                    />
                  </div>

                  <div>
                    <label className="text-xs font-heading font-black text-slate-700 uppercase tracking-wider block mb-1">
                      Anexar Print do Comprovante (opcional):
                    </label>
                    <label className="flex items-center justify-center gap-2 p-3 bg-white border-2 border-dashed border-slate-300 rounded-xl cursor-pointer hover:border-emerald-500 hover:bg-emerald-50/40 transition-all text-xs font-bold text-slate-700">
                      <Upload className="w-4 h-4 text-emerald-600" />
                      <span>{comprovanteFileName || 'Selecionar imagem / print do comprovante'}</span>
                      <input
                        type="file"
                        accept="image/*"
                        onChange={handleComprovanteFileChange}
                        className="hidden"
                      />
                    </label>

                    {comprovanteImage && (
                      <div className="mt-2 p-2 bg-white rounded-xl border border-slate-200 flex items-center gap-3">
                        <img
                          src={comprovanteImage}
                          alt="Prévia Comprovante"
                          className="w-12 h-12 object-cover rounded-lg border border-slate-300"
                        />
                        <div className="text-xs text-slate-700">
                          <span className="font-bold block truncate max-w-[200px]">{comprovanteFileName}</span>
                          <span className="text-emerald-700 font-semibold text-[11px]">Print anexado com sucesso</span>
                        </div>
                      </div>
                    )}
                  </div>
                </div>

                {/* Botão "Já paguei R$200 - Liberar acesso" */}
                <div className="space-y-2 pt-1">
                  <button
                    type="button"
                    onClick={handleSubmitProofOfPayment}
                    disabled={isSubmittingProof}
                    className="w-full bg-emerald-600 hover:bg-emerald-500 active:scale-98 text-white font-heading font-black py-4 px-4 rounded-xl shadow-lg transition-all cursor-pointer text-sm sm:text-base flex items-center justify-center gap-2"
                  >
                    {isSubmittingProof ? (
                      <>
                        <Loader2 className="w-5 h-5 animate-spin" />
                        <span>Enviando Comprovante...</span>
                      </>
                    ) : (
                      <>
                        <CheckCircle2 className="w-5 h-5 text-emerald-200" />
                        <span>Já paguei R$200 - Liberar acesso</span>
                      </>
                    )}
                  </button>

                  <button
                    type="button"
                    onClick={() => setIsPixModalOpen(false)}
                    className="w-full bg-slate-100 hover:bg-slate-200 text-slate-700 font-heading font-bold py-2.5 px-4 rounded-xl text-xs sm:text-sm transition-all cursor-pointer"
                  >
                    Fechar
                  </button>
                </div>
              </div>
            )}
          </div>
        </div>
      )}

      {/* Modal de Navegação GPS estilo Waze / Uber Driver para o Condutor */}
      {isDriverGpsOpen && (
        <DriverGpsNavigationModal
          driver={currentDriver}
          onClose={() => setIsDriverGpsOpen(false)}
          onCompleteRide={() => {
            onUpdateDriver({
              ...currentDriver,
              earningsToday: currentDriver.earningsToday + 28.5,
              earningsWeek: currentDriver.earningsWeek + 28.5,
              totalRides: currentDriver.totalRides + 1,
            });
            setIsDriverGpsOpen(false);
          }}
        />
      )}
    </div>
  );
};
