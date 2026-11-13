import React, { useState } from 'react';
import { AppUser, Driver } from '../types';
import { WEEKLY_FEE } from '../config/pricing';
import { Eye, EyeOff, AlertTriangle, ArrowLeft, Bike } from 'lucide-react';
import confetti from 'canvas-confetti';

interface MotoboyRegisterViewProps {
  onRegisterSuccess: (user: AppUser, newMotoboy: Driver) => void;
  onBackToLogin: () => void;
  existingDrivers?: Driver[];
}

export const MotoboyRegisterView: React.FC<MotoboyRegisterViewProps> = ({
  onRegisterSuccess,
  onBackToLogin,
  existingDrivers = [],
}) => {
  const [name, setName] = useState('');
  const [email, setEmail] = useState('');
  const [phone, setPhone] = useState('');
  const [password, setPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [motoPlate, setMotoPlate] = useState('');
  const [motoModel, setMotoModel] = useState('');
  const [cnh, setCnh] = useState('');
  const [errorMessage, setErrorMessage] = useState<string | null>(null);

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    setErrorMessage(null);

    const cleanEmail = email.trim().toLowerCase();
    const cleanName = name.trim();
    const cleanPhone = phone.trim();
    const cleanPlate = motoPlate.trim().toUpperCase();
    const cleanModel = motoModel.trim() || 'Honda CG 160 Fan';
    const cleanCnh = cnh.trim();

    if (!cleanName || !cleanEmail || !cleanPhone || !password || !cleanPlate || !cleanCnh) {
      setErrorMessage('Por favor, preencha todos os campos obrigatórios.');
      return;
    }

    if (password.length < 6) {
      setErrorMessage('A senha deve conter no mínimo 6 dígitos.');
      return;
    }

    if (existingDrivers.some((d) => d.email.toLowerCase() === cleanEmail)) {
      setErrorMessage('Já existe uma conta cadastrada com este e-mail. Faça login para continuar.');
      return;
    }

    // Cria conta de Motoboy Parceiro (RACE Flash Entregas & Moto Passageiro)
    const newMotoboy: Driver = {
      id: `mtb-${Date.now().toString().slice(-5)}`,
      name: cleanName,
      avatar: 'https://images.unsplash.com/photo-1558981403-c5f9899a28bc?w=150&auto=format&fit=crop&q=80',
      phone: cleanPhone,
      email: cleanEmail,
      cpf: '000.***.***-00',
      cnh: `${cleanCnh} - Categoria A (EAR)`,
      category: 'moto_entrega',
      vehicleModel: cleanModel,
      vehiclePlate: cleanPlate,
      vehicleColor: 'Preto',
      vehicleYear: 2024,
      rating: 5.0,
      totalRides: 0,
      status: 'online', // Sem taxa semanal, liberado para trabalhar
      lat: -23.0903,
      lng: -47.2180,
      weeklyPlanActive: true,
      weeklyPlanExpiresAt: null,
      weeklyFeePaidAt: null,
      weeklyFeeExpiresAt: null,
      weeklyPlanPrice: 0,
      earningsToday: 0,
      earningsWeek: 0,
      cnhVerified: true,
      vehicleVerified: true,
      criminalRecordClear: true,
      registrationDate: new Date().toISOString().split('T')[0],
      password: password,
    };

    const appUser: AppUser = {
      id: newMotoboy.id,
      name: newMotoboy.name,
      email: newMotoboy.email,
      phone: newMotoboy.phone,
      role: 'motoboy',
      tipo: 'motoboy',
      avatar: newMotoboy.avatar,
      rating: 5.0,
      password: password,
      driverData: newMotoboy,
    };

    // Salvar persistentemente no localStorage: race_current_user, race_users, race_registered_drivers
    try {
      localStorage.setItem('race_current_user', JSON.stringify({
        id: appUser.id,
        name: appUser.name,
        email: appUser.email,
        phone: appUser.phone,
        tipo: 'motoboy',
        role: 'motoboy',
        avatar: appUser.avatar,
        driverData: newMotoboy,
      }));

      const existingUsers = JSON.parse(localStorage.getItem('race_users') || '[]');
      const updatedUsers = [
        {
          id: appUser.id,
          name: appUser.name,
          email: appUser.email,
          phone: appUser.phone,
          tipo: 'motoboy',
          role: 'motoboy',
          password: password,
          createdAt: new Date().toISOString(),
        },
        ...existingUsers.filter((u: any) => u.email?.toLowerCase() !== cleanEmail),
      ];
      localStorage.setItem('race_users', JSON.stringify(updatedUsers));

      const existingDriversList = JSON.parse(localStorage.getItem('race_registered_drivers') || '[]');
      const updatedDrivers = [
        newMotoboy,
        ...existingDriversList.filter((d: any) => d.email?.toLowerCase() !== cleanEmail),
      ];
      localStorage.setItem('race_registered_drivers', JSON.stringify(updatedDrivers));
    } catch {}

    try {
      confetti({ particleCount: 75, spread: 80, origin: { y: 0.6 } });
    } catch {}

    onRegisterSuccess(appUser, newMotoboy);
  };

  return (
    <div className="min-h-screen bg-[#000000] text-white flex flex-col justify-center items-center px-6 py-12 selection:bg-[#ff6a00] selection:text-white">
      <div className="w-full max-w-sm sm:max-w-md space-y-6 animate-fade-in">
        {/* Topo: Título RACE em laranja e subtítulo Cadastro Motoboy */}
        <div className="text-center space-y-2">
          <div className="inline-flex items-center justify-center w-14 h-14 rounded-2xl bg-[#ff6a00]/10 border border-[#ff6a00]/30 text-[#ff6a00] mb-1">
            <Bike className="w-8 h-8" />
          </div>
          <h1 className="text-5xl sm:text-6xl font-heading font-black text-[#ff6a00] tracking-tighter uppercase select-none">
            RACE
          </h1>
          <p className="text-zinc-300 font-medium text-base sm:text-lg tracking-wide">
            Cadastro Motoboy Parceiro
          </p>
          <div className="inline-block bg-[#1a1a1a] border border-[#ff6a00]/40 rounded-full px-3 py-1 text-xs text-[#ff6a00] font-bold">
            85% seu • 15% Race • Sem Mensalidade
          </div>
        </div>

        {/* Mensagem de Erro se houver */}
        {errorMessage && (
          <div className="bg-red-950/80 border border-red-500/80 text-red-200 text-xs sm:text-sm p-3.5 rounded-xl flex items-center gap-2 font-medium">
            <AlertTriangle className="w-4 h-4 text-red-400 shrink-0" />
            <span>{errorMessage}</span>
          </div>
        )}

        {/* Formulário com campos: Nome, Email, Celular, Placa da moto, CNH, Senha */}
        <form onSubmit={handleSubmit} className="space-y-3.5 pt-1">
          {/* NOME COMPLETO */}
          <div className="space-y-1">
            <label className="text-white text-xs font-bold uppercase tracking-wider block">
              NOME COMPLETO
            </label>
            <input
              type="text"
              required
              value={name}
              onChange={(e) => setName(e.target.value)}
              placeholder="Seu nome completo"
              className="w-full bg-[#1a1a1a] border border-[#2a2a2a] text-white placeholder-zinc-500 rounded-xl px-4 py-2.5 text-sm focus:outline-none focus:border-[#ff6a00] transition-colors"
            />
          </div>

          {/* EMAIL & CELULAR */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            <div className="space-y-1">
              <label className="text-white text-xs font-bold uppercase tracking-wider block">
                EMAIL
              </label>
              <input
                type="email"
                required
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                placeholder="seu.email@exemplo.com"
                className="w-full bg-[#1a1a1a] border border-[#2a2a2a] text-white placeholder-zinc-500 rounded-xl px-3 py-2.5 text-sm focus:outline-none focus:border-[#ff6a00] transition-colors"
              />
            </div>

            <div className="space-y-1">
              <label className="text-white text-xs font-bold uppercase tracking-wider block">
                CELULAR / WHATSAPP
              </label>
              <input
                type="tel"
                required
                value={phone}
                onChange={(e) => setPhone(e.target.value)}
                placeholder="(11) 98765-4321"
                className="w-full bg-[#1a1a1a] border border-[#2a2a2a] text-white placeholder-zinc-500 rounded-xl px-3 py-2.5 text-sm focus:outline-none focus:border-[#ff6a00] transition-colors"
              />
            </div>
          </div>

          {/* SENHA */}
          <div className="space-y-1">
            <label className="text-white text-xs font-bold uppercase tracking-wider block">
              SENHA
            </label>
            <div className="relative">
              <input
                type={showPassword ? 'text' : 'password'}
                required
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                placeholder="Mínimo 6 dígitos"
                className="w-full bg-[#1a1a1a] border border-[#2a2a2a] text-white placeholder-zinc-500 rounded-xl px-4 py-2.5 text-sm focus:outline-none focus:border-[#ff6a00] transition-colors pr-11"
              />
              <button
                type="button"
                onClick={() => setShowPassword(!showPassword)}
                className="absolute right-3.5 top-2.5 text-zinc-400 hover:text-white transition-colors cursor-pointer"
              >
                {showPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
              </button>
            </div>
          </div>

          {/* PLACA DA MOTO & MODELO */}
          <div className="grid grid-cols-2 gap-3">
            <div className="space-y-1">
              <label className="text-white text-xs font-bold uppercase tracking-wider block">
                PLACA DA MOTO
              </label>
              <input
                type="text"
                required
                value={motoPlate}
                onChange={(e) => setMotoPlate(e.target.value)}
                placeholder="BRA2E19"
                className="w-full bg-[#1a1a1a] border border-[#2a2a2a] text-white placeholder-zinc-500 rounded-xl px-3 py-2.5 text-xs focus:outline-none focus:border-[#ff6a00] transition-colors uppercase"
              />
            </div>

            <div className="space-y-1">
              <label className="text-white text-xs font-bold uppercase tracking-wider block">
                MODELO DA MOTO
              </label>
              <input
                type="text"
                required
                value={motoModel}
                onChange={(e) => setMotoModel(e.target.value)}
                placeholder="Ex: Honda CG 160"
                className="w-full bg-[#1a1a1a] border border-[#2a2a2a] text-white placeholder-zinc-500 rounded-xl px-3 py-2.5 text-xs focus:outline-none focus:border-[#ff6a00] transition-colors"
              />
            </div>
          </div>

          {/* CNH DA MOTO */}
          <div className="space-y-1">
            <label className="text-white text-xs font-bold uppercase tracking-wider block">
              CNH (CATEGORIA A COM EAR)
            </label>
            <input
              type="text"
              required
              value={cnh}
              onChange={(e) => setCnh(e.target.value)}
              placeholder="Número de registro da CNH"
              className="w-full bg-[#1a1a1a] border border-[#2a2a2a] text-white placeholder-zinc-500 rounded-xl px-3 py-2.5 text-sm focus:outline-none focus:border-[#ff6a00] transition-colors"
            />
          </div>

          {/* Aviso do Novo Modelo 85% / 15% */}
          <div className="bg-[#1a1a1a] border border-emerald-500/40 rounded-xl p-3 text-xs text-zinc-300 space-y-1">
            <p className="font-bold text-emerald-400">
              Sem mensalidade, sem taxa para trabalhar
            </p>
            <p className="text-[11px] text-zinc-300">
              Você fica com 85% de cada corrida, Race fica com 15% - repasse automático toda sexta-feira direto na sua conta!
            </p>
          </div>

          {/* BOTÃO CADASTRAR */}
          <button
            type="submit"
            className="w-full bg-[#ff6a00] hover:bg-[#e05e00] active:scale-[0.99] text-white font-heading font-black text-base py-3.5 px-6 rounded-xl transition-all cursor-pointer shadow-lg shadow-[#ff6a00]/20 uppercase tracking-wider block mt-4"
          >
            CONCLUIR CADASTRO MOTOBOY
          </button>

          {/* Voltar para login */}
          <div className="text-center pt-1.5">
            <button
              type="button"
              onClick={onBackToLogin}
              className="text-[#ff6a00] hover:underline text-sm font-bold transition-all cursor-pointer inline-flex items-center gap-1.5"
            >
              <ArrowLeft className="w-4 h-4" />
              <span>Já tenho conta - Fazer Login</span>
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};
