import React, { useState } from 'react';
import { AppUser, Driver, VehicleCategory } from '../types';
import { 
  validateComfortEligibility, 
  COMFORT_POPULAR_MODELS, 
  ComfortValidationResult 
} from '../services/vehicleValidationService';
import { WEEKLY_SUBSCRIPTION_PRICE } from '../services/pricingService';
import { 
  X, 
  LogIn, 
  UserPlus, 
  Car, 
  Bike, 
  ShieldCheck, 
  Lock, 
  Eye, 
  EyeOff, 
  Sparkles, 
  AlertTriangle, 
  CheckCircle2, 
  ArrowRight,
  Zap
} from 'lucide-react';
import confetti from 'canvas-confetti';
import { ForgotPasswordModal } from './ForgotPasswordModal';
import { verifyUserLoginAsync } from '../services/userService';

interface AuthModalProps {
  isOpen: boolean;
  onClose: () => void;
  onAuthSuccess: (user: AppUser, driver?: Driver) => void;
  initialMode?: 'login' | 'register';
  initialRole?: 'passenger' | 'driver';
}

export const AuthModal: React.FC<AuthModalProps> = ({
  isOpen,
  onClose,
  onAuthSuccess,
  initialMode = 'login',
  initialRole = 'passenger',
}) => {
  const [mode, setMode] = useState<'login' | 'register'>(initialMode);
  const [role, setRole] = useState<'passenger' | 'driver'>(initialRole);

  // Form Fields
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [name, setName] = useState('');
  const [phone, setPhone] = useState('');
  const [showPassword, setShowPassword] = useState(false);

  // Driver-specific fields
  const [driverCategory, setDriverCategory] = useState<VehicleCategory>('confort');
  const [vehicleModel, setVehicleModel] = useState('Toyota Corolla Sedã');
  const [vehicleYear, setVehicleYear] = useState('2024');
  const [vehiclePlate, setVehiclePlate] = useState('RCE9C40');
  const [cnh, setCnh] = useState('09283719280');

  // Validation & Feedback
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const [successMessage, setSuccessMessage] = useState<string | null>(null);
  const [comfortNotice, setComfortNotice] = useState<string | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [isForgotPasswordOpen, setIsForgotPasswordOpen] = useState(false);

  if (!isOpen) return null;

  // Real-time comfort evaluation
  const comfortCheck: ComfortValidationResult = validateComfortEligibility(
    vehicleModel,
    parseInt(vehicleYear, 10) || 0
  );

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setErrorMessage(null);
    setSuccessMessage(null);
    setComfortNotice(null);

    if (!email || !password) {
      setErrorMessage('Por favor, preencha o login (e-mail) e a senha.');
      return;
    }

    if (password.length < 4) {
      setErrorMessage('A senha deve ter pelo menos 4 caracteres.');
      return;
    }

    if (mode === 'login') {
      setIsSubmitting(true);
      try {
        const res = await verifyUserLoginAsync(email, password);
        if (!res.success || !res.user) {
          setErrorMessage(res.error || 'Login ou senha incorretos.');
          return;
        }
        try {
          confetti({ particleCount: 50, spread: 60, origin: { y: 0.6 } });
        } catch {}
        onAuthSuccess(res.user, res.driver);
        onClose();
        return;
      } finally {
        setIsSubmitting(false);
      }
    }

    if (mode === 'register') {
      if (!name || !phone) {
        setErrorMessage('Por favor, informe seu nome completo e telefone.');
        return;
      }
      if (password.length < 6) {
        setErrorMessage('A senha de cadastro deve conter no mínimo 6 dígitos.');
        return;
      }
      if (password !== confirmPassword) {
        setErrorMessage('A confirmação de senha não confere com a senha digitada.');
        return;
      }
    }

    setIsSubmitting(true);

    let createdDriver: Driver | undefined = undefined;
    let finalCategory = driverCategory;
    let comfortEligible = false;
    let reason = '';

    if (role === 'driver') {
      const yearNum = parseInt(vehicleYear, 10) || 2023;
      if (driverCategory === 'confort') {
        const check = validateComfortEligibility(vehicleModel, yearNum);
        if (!check.eligible) {
          finalCategory = 'economica';
          comfortEligible = false;
          reason = `Homologado na Econômica: ${check.ruleDescription}`;
          setComfortNotice(
            `Aviso Confort: Seu ${vehicleModel} (${yearNum}) não atende à exigência mínima (${check.ruleDescription}). Homologado na categoria RACE Econômica (85% para você, 15% Race)!`
          );
        } else {
          comfortEligible = true;
          reason = `Aprovado Confort (${check.badgeText})`;
        }
      }

      createdDriver = {
        id: `drv-${Math.floor(100 + Math.random() * 900)}`,
        name: name || (email.split('@')[0].toUpperCase()),
        avatar: 'https://images.unsplash.com/photo-1535713875002-d1d0cf377fde?w=150&auto=format&fit=crop&q=80',
        phone: phone || '(11) 99887-1122',
        email,
        password,
        cpf: '345.890.123-45',
        cnh: `${cnh} (EAR Aprovado)`,
        category: finalCategory,
        vehicleModel,
        vehiclePlate: vehiclePlate.toUpperCase(),
        vehicleColor: 'Prata',
        vehicleYear: parseInt(vehicleYear, 10) || 2023,
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
    }

    const userTipo = role === 'driver' ? 'driver' : 'passenger';
    const appUser: AppUser = {
      id: `usr-${Date.now()}`,
      name: name || (email.split('@')[0]),
      email,
      phone: phone || '(11) 99887-1122',
      role,
      tipo: userTipo,
      avatar: 'https://images.unsplash.com/photo-1535713875002-d1d0cf377fde?w=150&auto=format&fit=crop&q=80',
      rating: 5.0,
      driverData: createdDriver,
    };

    try {
      localStorage.setItem('race_current_user', JSON.stringify({
        id: appUser.id,
        name: appUser.name,
        email: appUser.email,
        phone: appUser.phone,
        tipo: userTipo,
        role: appUser.role,
        avatar: appUser.avatar,
        driverData: createdDriver,
      }));

      const existingUsers = JSON.parse(localStorage.getItem('race_users') || '[]');
      const updatedUsers = [
        {
          id: appUser.id,
          name: appUser.name,
          email: appUser.email,
          phone: appUser.phone,
          tipo: userTipo,
          role: appUser.role,
          password,
          createdAt: new Date().toISOString(),
        },
        ...existingUsers.filter((u: any) => u.email?.toLowerCase() !== email.toLowerCase()),
      ];
      localStorage.setItem('race_users', JSON.stringify(updatedUsers));
    } catch {}

    setTimeout(() => {
      setIsSubmitting(false);
      try {
        confetti({ particleCount: 50, spread: 60, origin: { y: 0.6 } });
      } catch {}
      // User requested: "Após realização de cadastro com login e senha todos entrarão no aplicativo direto na página de atendimento de corridas"
      onAuthSuccess(appUser, createdDriver);
      onClose();
    }, 400);
  };


  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-3 bg-slate-950/70 backdrop-blur-sm animate-fade-in overflow-y-auto">
      <div className="bg-white rounded-3xl border border-slate-200 max-w-lg w-full p-6 sm:p-7 shadow-2xl relative my-auto">
        {/* Close Button */}
        <button
          onClick={onClose}
          className="absolute top-4 right-4 w-9 h-9 rounded-full bg-slate-100 hover:bg-slate-200 text-slate-700 flex items-center justify-center cursor-pointer transition-colors"
          aria-label="Fechar"
        >
          <X className="w-5 h-5" />
        </button>

        {/* Modal Header */}
        <div className="flex items-center gap-3 mb-5">
          <div className="w-12 h-12 rounded-2xl bg-slate-950 text-white flex items-center justify-center font-heading font-black text-2xl italic border border-slate-800 shadow">
            R
          </div>
          <div>
            <h3 className="font-heading font-black text-slate-950 text-xl sm:text-2xl">
              {mode === 'login' ? 'Entrar com Login e Senha' : 'Criar Cadastro RACE'}
            </h3>
            <p className="text-xs sm:text-sm text-slate-600 font-medium">
              Entre direto na Central de Atendimento de Corridas
            </p>
          </div>
        </div>

        {/* Mode Switcher: Login vs Cadastro */}
        <div className="flex bg-slate-100 p-1.5 rounded-2xl border border-slate-200 mb-4">
          <button
            type="button"
            onClick={() => {
              setMode('login');
              setErrorMessage(null);
            }}
            className={`flex-1 py-2.5 rounded-xl font-heading font-black text-xs sm:text-sm transition-all cursor-pointer flex items-center justify-center gap-2 ${
              mode === 'login'
                ? 'bg-amber-500 text-slate-950 shadow-md'
                : 'text-slate-600 hover:text-slate-950'
            }`}
          >
            <LogIn className="w-4 h-4" />
            <span>Fazer Login</span>
          </button>
          <button
            type="button"
            onClick={() => {
              setMode('register');
              setErrorMessage(null);
            }}
            className={`flex-1 py-2.5 rounded-xl font-heading font-black text-xs sm:text-sm transition-all cursor-pointer flex items-center justify-center gap-2 ${
              mode === 'register'
                ? 'bg-amber-500 text-slate-950 shadow-md'
                : 'text-slate-600 hover:text-slate-950'
            }`}
          >
            <UserPlus className="w-4 h-4" />
            <span>Novo Cadastro</span>
          </button>
        </div>

        {/* Role Selector: Passageiro vs Motorista/Motoboy */}
        <div className="mb-4">
          <label className="text-xs font-bold text-slate-700 block mb-1.5">
            Perfil de Acesso:
          </label>
          <div className="grid grid-cols-2 gap-2">
            <button
              type="button"
              onClick={() => setRole('passenger')}
              className={`p-3 rounded-2xl border text-left transition-all cursor-pointer flex items-center gap-2.5 ${
                role === 'passenger'
                  ? 'bg-slate-950 text-white border-slate-900 shadow-md'
                  : 'bg-white text-slate-800 border-slate-200 hover:bg-slate-50'
              }`}
            >
              <Car className="w-5 h-5 shrink-0" />
              <div>
                <span className="font-heading font-black text-xs sm:text-sm block">Passageiro</span>
                <span className="text-[11px] opacity-80 block">Solicitar corridas</span>
              </div>
            </button>

            <button
              type="button"
              onClick={() => setRole('driver')}
              className={`p-3 rounded-2xl border text-left transition-all cursor-pointer flex items-center gap-2.5 ${
                role === 'driver'
                  ? 'bg-slate-950 text-white border-slate-900 shadow-md'
                  : 'bg-white text-slate-800 border-slate-200 hover:bg-slate-50'
              }`}
            >
              <Zap className="w-5 h-5 text-amber-400 shrink-0" />
              <div>
                <span className="font-heading font-black text-xs sm:text-sm block">Motorista / Motoboy</span>
                <span className="text-[11px] opacity-80 block font-mono text-emerald-400 font-bold">85% seu • 15% Race</span>
              </div>
            </button>
          </div>
        </div>

        {/* Error or Success Feedback */}
        {successMessage && (
          <div className="mb-4 bg-emerald-50 border border-emerald-300 text-emerald-800 text-xs sm:text-sm p-3.5 rounded-2xl font-bold flex items-center gap-2">
            <CheckCircle2 className="w-5 h-5 text-emerald-600 shrink-0" />
            <span>{successMessage}</span>
          </div>
        )}

        {errorMessage && (
          <div className="mb-4 bg-rose-50 border border-rose-300 text-rose-800 text-xs sm:text-sm p-3.5 rounded-2xl font-bold flex items-center gap-2">
            <AlertTriangle className="w-5 h-5 text-rose-600 shrink-0" />
            <span>{errorMessage}</span>
          </div>
        )}

        {comfortNotice && (
          <div className="mb-4 bg-purple-50 border border-purple-300 text-purple-900 text-xs sm:text-sm p-3.5 rounded-2xl font-bold flex items-center gap-2">
            <Sparkles className="w-5 h-5 text-purple-700 shrink-0" />
            <span>{comfortNotice}</span>
          </div>
        )}

        {/* Form */}
        <form onSubmit={handleSubmit} className="space-y-3.5">
          {mode === 'register' && (
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              <div>
                <label className="text-xs font-bold text-slate-700 block mb-1">
                  Nome Completo *
                </label>
                <input
                  type="text"
                  required
                  value={name}
                  onChange={(e) => setName(e.target.value)}
                  placeholder="Ex: Seu Nome Completo"
                  className="w-full bg-white border border-slate-300 rounded-xl px-3.5 py-2 text-sm text-slate-950 focus:outline-none focus:border-amber-500 font-medium"
                />
              </div>

              <div>
                <label className="text-xs font-bold text-slate-700 block mb-1">
                  WhatsApp / Telefone *
                </label>
                <input
                  type="tel"
                  required
                  value={phone}
                  onChange={(e) => setPhone(e.target.value)}
                  placeholder="(11) 99887-6655"
                  className="w-full bg-white border border-slate-300 rounded-xl px-3.5 py-2 text-sm text-slate-950 focus:outline-none focus:border-amber-500 font-medium"
                />
              </div>
            </div>
          )}

          <div>
            <label className="text-xs font-bold text-slate-700 block mb-1">
              Login (E-mail de Acesso) *
            </label>
            <input
              type="email"
              required
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              placeholder="seu.email@exemplo.com"
              className="w-full bg-white border border-slate-300 rounded-xl px-3.5 py-2.5 text-sm sm:text-base text-slate-950 focus:outline-none focus:border-amber-500 font-medium"
            />
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            <div>
              <label className="text-xs font-bold text-slate-700 block mb-1">
                Senha de Acesso *
              </label>
              <div className="relative">
                <input
                  type={showPassword ? 'text' : 'password'}
                  required
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  placeholder={mode === 'register' ? 'Mínimo 6 dígitos' : 'Sua senha'}
                  className="w-full bg-white border border-slate-300 rounded-xl px-3.5 py-2 text-sm sm:text-base text-slate-950 focus:outline-none focus:border-amber-500 font-medium pr-10"
                />
                <button
                  type="button"
                  onClick={() => setShowPassword(!showPassword)}
                  className="absolute right-3 top-2.5 text-slate-400 hover:text-slate-800 cursor-pointer"
                >
                  {showPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                </button>
              </div>
            </div>

            {mode === 'register' && (
              <div>
                <label className="text-xs font-bold text-slate-700 block mb-1">
                  Confirmar Senha *
                </label>
                <input
                  type={showPassword ? 'text' : 'password'}
                  required
                  value={confirmPassword}
                  onChange={(e) => setConfirmPassword(e.target.value)}
                  placeholder="Repita sua senha"
                  className="w-full bg-white border border-slate-300 rounded-xl px-3.5 py-2 text-sm sm:text-base text-slate-950 focus:outline-none focus:border-amber-500 font-medium"
                />
              </div>
            )}
          </div>

          {/* If registering as Driver/Motoboy, show vehicle & Comfort fields */}
          {mode === 'register' && role === 'driver' && (
            <div className="bg-slate-50 border border-slate-200 rounded-2xl p-4 space-y-3 mt-2">
              <div className="flex items-center justify-between border-b border-slate-200 pb-2">
                <span className="text-xs font-black uppercase text-slate-900 font-mono flex items-center gap-1.5">
                  <Car className="w-4 h-4 text-amber-700" /> Dados do Veículo & Categoria
                </span>
                <span className="text-xs font-black text-emerald-700 bg-emerald-100 px-2 py-0.5 rounded">
                  85% seu • 15% Race (Sem mensalidade)
                </span>
              </div>

              <div className="grid grid-cols-2 gap-2.5">
                <div>
                  <label className="text-[11px] font-bold text-slate-700 block mb-0.5">
                    Categoria Desejada
                  </label>
                  <select
                    value={driverCategory}
                    onChange={(e) => setDriverCategory(e.target.value as VehicleCategory)}
                    className="w-full bg-white border border-slate-300 rounded-xl px-2.5 py-1.5 text-xs text-slate-900 font-bold focus:outline-none focus:border-amber-500"
                  >
                    <option value="confort">RACE Confort (R$ 3,50/km)</option>
                    <option value="economica">RACE Econômica (R$ 2,50/km)</option>
                    <option value="moto_passageiro">RACE Moto Passageiro</option>
                    <option value="moto_entrega">RACE Flash Entrega</option>
                  </select>
                </div>

                <div>
                  <label className="text-[11px] font-bold text-slate-700 block mb-0.5">
                    Ano de Fabricação
                  </label>
                  <input
                    type="number"
                    value={vehicleYear}
                    onChange={(e) => setVehicleYear(e.target.value)}
                    placeholder="2024"
                    className="w-full bg-white border border-slate-300 rounded-xl px-2.5 py-1.5 text-xs text-slate-900 font-bold focus:outline-none focus:border-amber-500"
                  />
                </div>
              </div>

              <div>
                <label className="text-[11px] font-bold text-slate-700 block mb-0.5">
                  Modelo do Veículo
                </label>
                <input
                  type="text"
                  value={vehicleModel}
                  onChange={(e) => setVehicleModel(e.target.value)}
                  placeholder="Ex: Toyota Corolla Sedã ou Argo"
                  className="w-full bg-white border border-slate-300 rounded-xl px-2.5 py-1.5 text-xs text-slate-900 font-bold focus:outline-none focus:border-amber-500"
                />
              </div>

              {driverCategory === 'confort' && (
                <div className={`p-2.5 rounded-xl border text-xs font-bold ${
                  comfortCheck.eligible
                    ? 'bg-purple-100/70 border-purple-300 text-purple-950'
                    : 'bg-amber-100/70 border-amber-300 text-amber-950'
                }`}>
                  <div className="flex items-center gap-1.5 mb-0.5">
                    <Sparkles className="w-3.5 h-3.5 text-purple-700" />
                    <span>Exigência Confort: {comfortCheck.badgeText}</span>
                  </div>
                  <p className="text-[11px] font-normal leading-tight opacity-90">
                    {comfortCheck.ruleDescription}
                  </p>
                </div>
              )}
            </div>
          )}

          {/* Submit Action */}
          <button
            type="submit"
            disabled={isSubmitting}
            className="w-full bg-[#ff6a00] hover:bg-[#e05e00] text-white font-heading font-black py-4 rounded-xl transition-all cursor-pointer shadow-lg shadow-[#ff6a00]/20 text-sm sm:text-base flex items-center justify-center gap-2 active:scale-98 disabled:opacity-50 mt-4 uppercase tracking-wider"
          >
            <span>
              {mode === 'login'
                ? 'ENTRAR DIRETO NA CENTRAL DE ATENDIMENTO'
                : 'CONCLUIR CADASTRO E ENTRAR NA CENTRAL DE CORRIDAS'}
            </span>
            <ArrowRight className="w-5 h-5" />
          </button>

          {mode === 'login' && (
            <div className="pt-1 text-center">
              <button
                type="button"
                onClick={() => setIsForgotPasswordOpen(true)}
                className="text-xs font-bold text-slate-600 hover:text-[#ff6a00] underline underline-offset-4 cursor-pointer transition-colors"
              >
                Esqueci a senha
              </button>
            </div>
          )}
        </form>
      </div>

      <ForgotPasswordModal
        isOpen={isForgotPasswordOpen}
        onClose={() => setIsForgotPasswordOpen(false)}
        initialIdentifier={email}
        onPasswordResetSuccess={(resolvedIdentifier, msg) => {
          setMode('login');
          setEmail(resolvedIdentifier);
          setPassword('');
          setErrorMessage(null);
          setSuccessMessage(msg);
        }}
      />
    </div>
  );
};
