import React, { useState } from 'react';
import { Driver, Ride, VehicleCategory } from '../types';
import { formatBRL, WEEKLY_SUBSCRIPTION_PRICE } from '../services/pricingService';
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
  ArrowRight
} from 'lucide-react';
import confetti from 'canvas-confetti';

interface DriverPartnerPortalProps {
  currentDriver: Driver;
  onUpdateDriver: (driver: Driver) => void;
  onRegisterDriver: (newDriver: Driver) => void;
  onAcceptIncomingRide?: (ride: Ride) => void;
  onOpenSupport: () => void;
  onOpenShare?: () => void;
  onNavigateToRides?: () => void;
}

export const DriverPartnerPortal: React.FC<DriverPartnerPortalProps> = ({
  currentDriver,
  onUpdateDriver,
  onRegisterDriver,
  onOpenSupport,
  onOpenShare,
  onNavigateToRides,
}) => {
  const [activeSubTab, setActiveSubTab] = useState<'dashboard' | 'login' | 'register' | 'subscription'>('dashboard');
  const [isOnline, setIsOnline] = useState(currentDriver.status === 'online');
  const [acceptedRideNotice, setAcceptedRideNotice] = useState<string | null>(null);
  const [comfortWarning, setComfortWarning] = useState<string | null>(null);

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

  // Subscription payment simulation state
  const [subPayMethod, setSubPayMethod] = useState<'pix' | 'credit_card'>('pix');
  const [showPixQr, setShowPixQr] = useState(false);
  const [copiedPix, setCopiedPix] = useState(false);

  // Live evaluation of Confort eligibility
  const comfortCheck: ComfortValidationResult = validateComfortEligibility(
    regModel,
    parseInt(regYear, 10) || 0
  );

  const toggleOnline = () => {
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
      lat: -23.5615,
      lng: -46.6558,
      weeklyPlanActive: true,
      weeklyPlanExpiresAt: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000).toISOString(),
      weeklyPlanPrice: WEEKLY_SUBSCRIPTION_PRICE,
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

  const handlePayWeeklyPlan = () => {
    setShowPixQr(true);
    setTimeout(() => {
      onUpdateDriver({
        ...currentDriver,
        weeklyPlanActive: true,
        weeklyPlanExpiresAt: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000).toISOString(),
      });
      try {
        confetti({
          particleCount: 50,
          spread: 60,
          origin: { y: 0.6 },
        });
      } catch {
        // safe
      }
    }, 2500);
  };

  const handleCopyPix = () => {
    navigator.clipboard?.writeText(
      '00020126580014BR.GOV.BCB.PIX0136race-financeiro-plano-300-semanal-sem-taxas5204000053039865406300.005802BR5910RACE BRASIL6009SAO PAULO62070503***6304E8A1'
    );
    setCopiedPix(true);
    setTimeout(() => setCopiedPix(false), 2000);
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
          <span>Plano R$ 300</span>
          <span className="w-2.5 h-2.5 rounded-full bg-emerald-500"></span>
        </button>
      </div>

      {/* SUBTAB 1: DRIVER DASHBOARD */}
      {activeSubTab === 'dashboard' && (
        <div className="space-y-4">
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
                  Sem comissão por corrida. Apenas assinatura semanal fixa de R$ 300.
                </p>
              </div>
            </div>

            <div className="text-right">
              <span className="text-xs text-slate-500 font-mono block font-bold">Status do Plano</span>
              <span className="text-sm font-black text-emerald-700 flex items-center gap-1 justify-end">
                <CheckCircle2 className="w-4 h-4" /> Ativo
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
                Assinatura R$ 300 quitada
              </p>
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
                    <span>Embarque: Rua Bela Cintra, 890 - Consolação</span>
                  </div>
                  <div className="flex items-center gap-2.5 font-medium">
                    <span className="w-2.5 h-2.5 rounded-full bg-amber-600" />
                    <span>Destino: Shopping Morumbi - Av. Roque Petroni Jr.</span>
                  </div>
                </div>

                {acceptedRideNotice && (
                  <div className="bg-emerald-50 border border-emerald-300 text-emerald-900 p-3.5 rounded-xl font-bold text-sm flex items-center justify-between animate-fade-in">
                    <div className="flex items-center gap-2">
                      <CheckCircle2 className="w-5 h-5 text-emerald-600 shrink-0" />
                      <span>{acceptedRideNotice}</span>
                    </div>
                    <button
                      onClick={() => setAcceptedRideNotice(null)}
                      className="text-xs text-emerald-700 hover:text-emerald-900 font-bold ml-2 cursor-pointer"
                    >
                      ✕
                    </button>
                  </div>
                )}

                <div className="flex items-center gap-3 pt-2">
                  <button
                    onClick={() => {
                      onUpdateDriver({
                        ...currentDriver,
                        earningsToday: currentDriver.earningsToday + 28.5,
                        earningsWeek: currentDriver.earningsWeek + 28.5,
                        totalRides: currentDriver.totalRides + 1,
                      });
                      setAcceptedRideNotice('Corrida aceita com sucesso! Rota enviada para o GPS. Ganhos de R$ 28,50 (100% livres) creditados.');
                      try {
                        confetti({ particleCount: 40, spread: 55, origin: { y: 0.6 } });
                      } catch {}
                      setTimeout(() => setAcceptedRideNotice(null), 6000);
                    }}
                    className="flex-1 bg-amber-500 hover:bg-amber-400 text-slate-950 font-heading font-black py-3.5 rounded-xl text-sm transition-all cursor-pointer shadow active:scale-95 text-center border border-amber-400"
                  >
                    ACEITAR CORRIDA (R$ 28,50)
                  </button>
                  <button
                    onClick={onOpenSupport}
                    className="px-4 py-3.5 bg-white hover:bg-slate-100 text-slate-800 rounded-xl text-sm font-bold cursor-pointer border border-slate-300"
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

      {/* SUBTAB 2: LOGIN DO CONDUTOR (LOGIN E SENHA) */}
      {activeSubTab === 'login' && (
        <div className="bg-white border border-slate-200 rounded-3xl p-6 sm:p-7 shadow-md space-y-5 max-w-xl mx-auto">
          <div className="border-b border-slate-200 pb-4 text-center">
            <div className="w-14 h-14 bg-amber-100 text-amber-800 rounded-2xl flex items-center justify-center mx-auto mb-2 border border-amber-300">
              <Lock className="w-7 h-7" />
            </div>
            <h3 className="font-heading font-black text-slate-950 text-2xl">
              Acesso do Motorista e Motoboy
            </h3>
            <p className="text-sm text-slate-600 font-medium mt-1">
              Entre com seu e-mail e senha cadastrados para acessar o aplicativo
            </p>
          </div>

          {loginFeedback && (
            <div className="bg-rose-50 border border-rose-300 text-rose-800 text-sm p-3.5 rounded-xl font-medium">
              {loginFeedback}
            </div>
          )}

          <form onSubmit={handleLoginSubmit} className="space-y-4">
            <div>
              <label className="text-xs sm:text-sm font-bold text-slate-700 block mb-1.5">
                Login / E-mail do Parceiro *
              </label>
              <input
                type="email"
                required
                value={loginEmail}
                onChange={(e) => setLoginEmail(e.target.value)}
                placeholder="Ex: seuemail@raceapp.com.br"
                className="w-full bg-slate-50 border border-slate-300 rounded-xl px-4 py-3 text-sm sm:text-base text-slate-950 focus:outline-none focus:border-amber-500 font-medium"
              />
            </div>

            <div>
              <label className="text-xs sm:text-sm font-bold text-slate-700 block mb-1.5">
                Senha de Acesso *
              </label>
              <div className="relative">
                <input
                  type={showLoginPassword ? 'text' : 'password'}
                  required
                  value={loginPassword}
                  onChange={(e) => setLoginPassword(e.target.value)}
                  placeholder="Digite sua senha cadastrada"
                  className="w-full bg-slate-50 border border-slate-300 rounded-xl px-4 py-3 text-sm sm:text-base text-slate-950 focus:outline-none focus:border-amber-500 font-medium pr-12"
                />
                <button
                  type="button"
                  onClick={() => setShowLoginPassword(!showLoginPassword)}
                  className="absolute right-3.5 top-3.5 text-slate-500 hover:text-slate-800 cursor-pointer"
                >
                  {showLoginPassword ? <EyeOff className="w-5 h-5" /> : <Eye className="w-5 h-5" />}
                </button>
              </div>
            </div>

            <div className="flex items-center justify-between text-xs sm:text-sm text-slate-600 pt-1">
              <label className="flex items-center gap-2 cursor-pointer">
                <input type="checkbox" defaultChecked className="rounded border-slate-300 text-amber-500" />
                <span>Lembrar meu login neste aparelho</span>
              </label>
              <button
                type="button"
                onClick={onOpenSupport}
                className="text-amber-800 hover:underline font-bold"
              >
                Esqueci minha senha
              </button>
            </div>

            <button
              type="submit"
              className="w-full bg-amber-500 hover:bg-amber-400 text-slate-950 font-heading font-black py-4 rounded-xl transition-all cursor-pointer shadow-md text-sm sm:text-base border border-amber-400 flex items-center justify-center gap-2"
            >
              <LogIn className="w-5 h-5" />
              <span>ENTRAR NO MEU PAINEL RACE</span>
            </button>
          </form>

          {/* Quick account switch for convenience */}
          <div className="border-t border-slate-200 pt-4 text-center">
            <span className="text-xs text-slate-500 font-medium block mb-2">
              Ou acesse rapidamente uma conta de demonstração:
            </span>
            <div className="flex justify-center gap-2">
              <button
                type="button"
                onClick={() => {
                  setLoginEmail('carlos.silva@raceapp.com.br');
                  setLoginPassword('race123');
                }}
                className="text-xs bg-slate-100 hover:bg-slate-200 text-slate-800 font-bold px-3 py-1.5 rounded-lg border border-slate-300 cursor-pointer"
              >
                Preencher Carlos (Onix)
              </button>
              <button
                type="button"
                onClick={() => {
                  setLoginEmail('renata.prado@raceapp.com.br');
                  setLoginPassword('race123');
                }}
                className="text-xs bg-purple-50 hover:bg-purple-100 text-purple-900 font-bold px-3 py-1.5 rounded-lg border border-purple-200 cursor-pointer"
              >
                Preencher Renata (Corolla Confort)
              </button>
            </div>
          </div>
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
                CRIAR LOGIN, SENHA E FINALIZAR CADASTRO NO PLANO R$ 300
              </button>
            </form>
          )}
        </div>
      )}

      {/* SUBTAB 4: SUBSCRIPTION PLAN (R$ 300 SEMANAL) */}
      {activeSubTab === 'subscription' && (
        <div className="space-y-4">
          <div className="bg-white border-2 border-amber-400 rounded-3xl p-6 sm:p-7 shadow-lg relative overflow-hidden">
            <div className="flex items-start justify-between mb-5">
              <div>
                <span className="bg-amber-500 text-slate-950 font-black text-xs px-3 py-1 rounded-full font-mono uppercase tracking-wider">
                  MODELO EXCLUSIVO RACE
                </span>
                <h2 className="font-heading font-black text-slate-950 text-2xl sm:text-3xl mt-2">
                  Assinatura Semanal de R$ 300,00
                </h2>
                <p className="text-sm sm:text-base text-slate-700 mt-1 max-w-lg font-medium">
                  Esqueça as taxas abusivas dos outros apps. Na RACE você paga apenas R$ 300 por semana e <strong>fica com 100% de todo o dinheiro das corridas</strong>!
                </p>
              </div>

              <div className="text-right">
                <div className="text-3xl sm:text-4xl font-heading font-black text-amber-700">
                  R$ 300
                </div>
                <span className="text-xs sm:text-sm text-slate-500 font-mono font-bold">/ semana</span>
              </div>
            </div>

            {/* Checklist of Benefits */}
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 my-5">
              {[
                '0% de taxa sobre corridas (100% de ganho líquido)',
                'Suporte técnico e operacional 24 horas por dia',
                'GPS em tempo real com algoritmo que economiza combustível',
                'Acesso a passageiros corporativos e entrega flash',
                'Sem metas obrigatórias: trabalhe os horários que desejar',
                'Seguro APP contra acidentes pessoais incluso',
              ].map((benefit, i) => (
                <div key={i} className="flex items-center gap-2.5 text-xs sm:text-sm text-slate-800 bg-slate-50 p-3 rounded-xl border border-slate-200 font-medium">
                  <CheckCircle2 className="w-5 h-5 text-emerald-600 shrink-0" />
                  <span>{benefit}</span>
                </div>
              ))}
            </div>

            {/* Payment Method Selector */}
            <div className="bg-slate-50 p-5 rounded-2xl border border-slate-200 mt-5 space-y-4">
              <h4 className="text-xs sm:text-sm font-heading font-black text-slate-900 uppercase tracking-wider">
                Renovação ou Pagamento do Plano
              </h4>

              <div className="grid grid-cols-2 gap-3">
                <button
                  type="button"
                  onClick={() => setSubPayMethod('pix')}
                  className={`p-3.5 rounded-xl border-2 flex items-center justify-center gap-2 text-sm font-black transition-all cursor-pointer ${
                    subPayMethod === 'pix'
                      ? 'bg-emerald-50 border-emerald-500 text-emerald-900 shadow-sm'
                      : 'bg-white border-slate-200 text-slate-700'
                  }`}
                >
                  <QrCode className="w-5 h-5 text-emerald-600" />
                  <span>PIX Instantâneo</span>
                </button>

                <button
                  type="button"
                  onClick={() => setSubPayMethod('credit_card')}
                  className={`p-3.5 rounded-xl border-2 flex items-center justify-center gap-2 text-sm font-black transition-all cursor-pointer ${
                    subPayMethod === 'credit_card'
                      ? 'bg-amber-50 border-amber-500 text-amber-900 shadow-sm'
                      : 'bg-white border-slate-200 text-slate-700'
                  }`}
                >
                  <CreditCard className="w-5 h-5 text-amber-600" />
                  <span>Cartão de Crédito</span>
                </button>
              </div>

              {/* PIX Simulated Flow */}
              {showPixQr && (
                <div className="bg-white p-5 rounded-2xl border border-emerald-400 text-center space-y-3.5 shadow-md">
                  <div className="inline-block p-4 bg-slate-50 rounded-2xl border border-slate-200">
                    <QrCode className="w-28 h-28 text-emerald-700 animate-pulse mx-auto" />
                    <span className="text-xs font-mono font-bold text-emerald-800 mt-1 block">PIX SEGURO RACE</span>
                  </div>

                  <p className="text-sm text-slate-800 font-semibold">
                    Chave PIX Copia e Cola gerada para <strong>R$ 300,00</strong>:
                  </p>

                  <div className="flex items-center justify-center gap-2">
                    <button
                      onClick={handleCopyPix}
                      className="bg-emerald-600 hover:bg-emerald-500 text-white font-black text-sm px-5 py-2.5 rounded-xl transition-all cursor-pointer shadow"
                    >
                      {copiedPix ? 'Copiado com Sucesso!' : 'Copiar Código PIX'}
                    </button>
                  </div>
                  <span className="text-xs text-emerald-700 block font-bold">
                    Aprovação em menos de 3 segundos com liberação imediata
                  </span>
                </div>
              )}

              {!showPixQr && (
                <button
                  onClick={handlePayWeeklyPlan}
                  className="w-full bg-amber-500 hover:bg-amber-400 text-slate-950 font-heading font-black py-4 rounded-xl transition-all cursor-pointer shadow-md text-sm sm:text-base border border-amber-400"
                >
                  PAGAR ASSINATURA SEMANAL (R$ 300,00)
                </button>
              )}
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
