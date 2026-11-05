import React, { useState } from 'react';
import { Driver, VehicleCategory, AppUser } from '../types';
import { WEEKLY_FEE } from '../config/pricing';
import { Eye, EyeOff, AlertTriangle, ArrowRight, CheckCircle2, Car, Zap } from 'lucide-react';
import confetti from 'canvas-confetti';

interface DriverLoginScreenProps {
  drivers: Driver[];
  onLoginSuccess: (user: AppUser, driver: Driver) => void;
  onRegisterSuccess: (user: AppUser, newDriver: Driver) => void;
}

export const DriverLoginScreen: React.FC<DriverLoginScreenProps> = ({
  drivers,
  onLoginSuccess,
  onRegisterSuccess,
}) => {
  const [mode, setMode] = useState<'login' | 'register'>('login');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);

  // Registration Fields
  const [name, setName] = useState('');
  const [phone, setPhone] = useState('');
  const [vehicleModel, setVehicleModel] = useState('Chevrolet Onix Plus');
  const [vehiclePlate, setVehiclePlate] = useState('BRA2E19');
  const [vehicleCategory, setVehicleCategory] = useState<VehicleCategory>('economica');

  const handleLoginSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    setErrorMessage(null);

    const cleanEmail = email.trim().toLowerCase();
    if (!cleanEmail || !password) {
      setErrorMessage('Por favor, informe seu email e sua senha.');
      return;
    }

    // Find driver by email or fallback to first matching/demo driver
    const matched = drivers.find(
      (d) => d.email.toLowerCase() === cleanEmail
    );

    const now = new Date();
    let targetDriver: Driver;

    if (matched) {
      const expiresDate = matched.weeklyFeeExpiresAt
        ? new Date(matched.weeklyFeeExpiresAt)
        : matched.weeklyPlanExpiresAt
        ? new Date(matched.weeklyPlanExpiresAt)
        : null;
      const isSubActive = Boolean(matched.weeklyPlanActive && expiresDate && expiresDate > now);

      targetDriver = {
        ...matched,
        status: isSubActive ? 'online' : 'offline',
      };
    } else {
      // Create new driver session with default active 7-day plan
      targetDriver = {
        id: `drv-${Date.now().toString().slice(-4)}`,
        name: cleanEmail.split('@')[0].toUpperCase(),
        avatar: 'https://images.unsplash.com/photo-1534528741775-53994a69daeb?w=150&auto=format&fit=crop&q=80',
        phone: '(11) 98765-4321',
        email: cleanEmail,
        cpf: '000.***.***-00',
        cnh: '01234567890 - Categoria B (EAR)',
        category: 'economica',
        vehicleModel: 'Veículo Parceiro',
        vehiclePlate: 'RCE0A00',
        vehicleColor: 'Prata',
        vehicleYear: 2023,
        rating: 5.0,
        totalRides: 0,
        status: 'online',
        lat: -23.5615,
        lng: -46.6558,
        weeklyPlanActive: true,
        weeklyPlanExpiresAt: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000).toISOString(),
        weeklyFeePaidAt: new Date().toISOString(),
        weeklyFeeExpiresAt: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000).toISOString(),
        weeklyPlanPrice: WEEKLY_FEE,
        earningsToday: 0,
        earningsWeek: 0,
        cnhVerified: true,
        vehicleVerified: true,
        criminalRecordClear: true,
        registrationDate: new Date().toISOString().split('T')[0],
      };
    }

    const appUser: AppUser = {
      id: targetDriver.id,
      name: targetDriver.name,
      email: targetDriver.email,
      phone: targetDriver.phone,
      role: 'driver',
      avatar: targetDriver.avatar,
      rating: targetDriver.rating,
      driverData: targetDriver,
    };

    try {
      confetti({ particleCount: 50, spread: 60, origin: { y: 0.6 } });
    } catch {}

    onLoginSuccess(appUser, targetDriver);
  };

  const handleRegisterSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    setErrorMessage(null);

    const cleanEmail = email.trim().toLowerCase();
    if (!cleanEmail || !password || !name || !phone) {
      setErrorMessage('Por favor, preencha todos os campos obrigatórios.');
      return;
    }

    const newDriver: Driver = {
      id: `drv-${Date.now().toString().slice(-4)}`,
      name: name.trim(),
      avatar: 'https://images.unsplash.com/photo-1534528741775-53994a69daeb?w=150&auto=format&fit=crop&q=80',
      phone: phone.trim(),
      email: cleanEmail,
      cpf: '000.***.***-00',
      cnh: '01234567890 - Categoria B (EAR)',
      category: vehicleCategory,
      vehicleModel: vehicleModel.trim() || 'Veículo Parceiro',
      vehiclePlate: (vehiclePlate.trim() || 'RCE1A00').toUpperCase(),
      vehicleColor: 'Preto',
      vehicleYear: 2024,
      rating: 5.0,
      totalRides: 0,
      status: 'online',
      lat: -23.5615,
      lng: -46.6558,
      weeklyPlanActive: true,
      weeklyPlanExpiresAt: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000).toISOString(),
      weeklyFeePaidAt: new Date().toISOString(),
      weeklyFeeExpiresAt: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000).toISOString(),
      weeklyPlanPrice: WEEKLY_FEE,
      earningsToday: 0,
      earningsWeek: 0,
      cnhVerified: true,
      vehicleVerified: true,
      criminalRecordClear: true,
      registrationDate: new Date().toISOString().split('T')[0],
    };

    const appUser: AppUser = {
      id: newDriver.id,
      name: newDriver.name,
      email: newDriver.email,
      phone: newDriver.phone,
      role: 'driver',
      avatar: newDriver.avatar,
      rating: 5.0,
      driverData: newDriver,
    };

    try {
      confetti({ particleCount: 70, spread: 75, origin: { y: 0.6 } });
    } catch {}

    onRegisterSuccess(appUser, newDriver);
  };

  const handleQuickDemo = (demoEmail: string) => {
    setEmail(demoEmail);
    setPassword('race123');
  };

  return (
    <div className="min-h-screen bg-[#000000] text-white flex flex-col justify-center items-center px-6 py-12 selection:bg-[#ff6a00] selection:text-white">
      <div className="w-full max-w-sm sm:max-w-md space-y-8 animate-fade-in">
        {/* Topo: Título RACE em laranja #ff6a00, bem grande, bold, centralizado */}
        <div className="text-center space-y-2">
          <h1 className="text-6xl sm:text-7xl font-heading font-black text-[#ff6a00] tracking-tighter uppercase select-none">
            RACE
          </h1>
          {/* Subtítulo: "App do Motorista" em branco/cinza claro, embaixo do RACE */}
          <p className="text-zinc-300 font-medium text-base sm:text-lg tracking-wide">
            {mode === 'login' ? 'App do Motorista' : 'Cadastro de Motorista Parceiro'}
          </p>
        </div>

        {/* Mensagem de Erro se houver */}
        {errorMessage && (
          <div className="bg-red-950/80 border border-red-500/80 text-red-200 text-xs sm:text-sm p-3.5 rounded-xl flex items-center gap-2 font-medium">
            <AlertTriangle className="w-4 h-4 text-red-400 shrink-0" />
            <span>{errorMessage}</span>
          </div>
        )}

        {/* Formulário: Design exatamente igual ao print preto e laranja */}
        {mode === 'login' ? (
          <form onSubmit={handleLoginSubmit} className="space-y-6 pt-2">
            {/* Campo EMAIL */}
            <div className="space-y-2">
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
            <div className="space-y-2">
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
              className="w-full bg-[#ff6a00] hover:bg-[#e05e00] active:scale-[0.99] text-white font-heading font-black text-lg py-4 px-6 rounded-xl transition-all cursor-pointer shadow-lg shadow-[#ff6a00]/20 uppercase tracking-wider block mt-8"
            >
              ENTRAR
            </button>

            {/* Link embaixo: "Criar conta de motorista" laranja, centralizado */}
            <div className="text-center pt-2">
              <button
                type="button"
                onClick={() => {
                  setErrorMessage(null);
                  setMode('register');
                }}
                className="text-[#ff6a00] hover:underline text-sm sm:text-base font-bold transition-all cursor-pointer inline-block"
              >
                Criar conta de motorista
              </button>
            </div>
          </form>
        ) : (
          <form onSubmit={handleRegisterSubmit} className="space-y-4 pt-2">
            {/* NOME COMPLETO */}
            <div className="space-y-1.5">
              <label className="text-white text-xs font-bold uppercase tracking-wider block">
                NOME COMPLETO
              </label>
              <input
                type="text"
                required
                value={name}
                onChange={(e) => setName(e.target.value)}
                placeholder="Ex: Carlos Silva"
                className="w-full bg-[#1a1a1a] border border-[#2a2a2a] text-white placeholder-zinc-500 rounded-xl px-4 py-3 text-sm focus:outline-none focus:border-[#ff6a00] transition-colors"
              />
            </div>

            {/* WHATSAPP / TELEFONE */}
            <div className="space-y-1.5">
              <label className="text-white text-xs font-bold uppercase tracking-wider block">
                WHATSAPP / TELEFONE
              </label>
              <input
                type="tel"
                required
                value={phone}
                onChange={(e) => setPhone(e.target.value)}
                placeholder="(11) 98765-4321"
                className="w-full bg-[#1a1a1a] border border-[#2a2a2a] text-white placeholder-zinc-500 rounded-xl px-4 py-3 text-sm focus:outline-none focus:border-[#ff6a00] transition-colors"
              />
            </div>

            {/* EMAIL */}
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
                className="w-full bg-[#1a1a1a] border border-[#2a2a2a] text-white placeholder-zinc-500 rounded-xl px-4 py-3 text-sm focus:outline-none focus:border-[#ff6a00] transition-colors"
              />
            </div>

            {/* SENHA */}
            <div className="space-y-1.5">
              <label className="text-white text-xs font-bold uppercase tracking-wider block">
                SENHA
              </label>
              <input
                type="password"
                required
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                placeholder="Mínimo 6 dígitos"
                className="w-full bg-[#1a1a1a] border border-[#2a2a2a] text-white placeholder-zinc-500 rounded-xl px-4 py-3 text-sm focus:outline-none focus:border-[#ff6a00] transition-colors"
              />
            </div>

            {/* VEÍCULO & PLACA */}
            <div className="grid grid-cols-2 gap-3 pt-1">
              <div className="space-y-1.5">
                <label className="text-white text-xs font-bold uppercase tracking-wider block">
                  MODELO DO CARRO
                </label>
                <input
                  type="text"
                  required
                  value={vehicleModel}
                  onChange={(e) => setVehicleModel(e.target.value)}
                  placeholder="Ex: Onix 1.0"
                  className="w-full bg-[#1a1a1a] border border-[#2a2a2a] text-white placeholder-zinc-500 rounded-xl px-3 py-2.5 text-xs focus:outline-none focus:border-[#ff6a00] transition-colors"
                />
              </div>

              <div className="space-y-1.5">
                <label className="text-white text-xs font-bold uppercase tracking-wider block">
                  PLACA DO VEÍCULO
                </label>
                <input
                  type="text"
                  required
                  value={vehiclePlate}
                  onChange={(e) => setVehiclePlate(e.target.value)}
                  placeholder="BRA2E19"
                  className="w-full bg-[#1a1a1a] border border-[#2a2a2a] text-white placeholder-zinc-500 rounded-xl px-3 py-2.5 text-xs focus:outline-none focus:border-[#ff6a00] transition-colors uppercase"
                />
              </div>
            </div>

            {/* BOTÃO CADASTRAR */}
            <button
              type="submit"
              className="w-full bg-[#ff6a00] hover:bg-[#e05e00] active:scale-[0.99] text-white font-heading font-black text-base py-3.5 px-6 rounded-xl transition-all cursor-pointer shadow-lg shadow-[#ff6a00]/20 uppercase tracking-wider block mt-6"
            >
              CONCLUIR CADASTRO
            </button>

            {/* Voltar para login */}
            <div className="text-center pt-2">
              <button
                type="button"
                onClick={() => {
                  setErrorMessage(null);
                  setMode('login');
                }}
                className="text-[#ff6a00] hover:underline text-sm font-bold transition-all cursor-pointer inline-block"
              >
                Já tenho conta de motorista - Entrar
              </button>
            </div>
          </form>
        )}

        {/* Acesso rápido para testes/demonstração */}
        <div className="pt-8 border-t border-[#1a1a1a] text-center space-y-2.5">
          <span className="text-zinc-500 text-xs font-medium block">
            Acesso Rápido para Demonstração:
          </span>
          <div className="flex flex-wrap justify-center gap-2">
            <button
              type="button"
              onClick={() => handleQuickDemo('carlos.silva@raceapp.com.br')}
              className="text-xs bg-[#1a1a1a] hover:bg-[#252525] text-zinc-300 hover:text-white px-3 py-1.5 rounded-lg border border-[#2a2a2a] transition-colors cursor-pointer"
            >
              🚗 Carlos Silva (Ativo)
            </button>
            <button
              type="button"
              onClick={() => handleQuickDemo('renata.prado@raceapp.com.br')}
              className="text-xs bg-[#1a1a1a] hover:bg-[#252525] text-zinc-300 hover:text-white px-3 py-1.5 rounded-lg border border-[#2a2a2a] transition-colors cursor-pointer"
            >
              ✨ Renata Prado (Confort)
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};
