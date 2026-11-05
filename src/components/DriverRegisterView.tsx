import React, { useState } from 'react';
import { AppUser, Driver, VehicleCategory } from '../types';
import { WEEKLY_FEE } from '../config/pricing';
import { Eye, EyeOff, AlertTriangle, ArrowLeft } from 'lucide-react';
import confetti from 'canvas-confetti';

interface DriverRegisterViewProps {
  onRegisterSuccess: (user: AppUser, newDriver: Driver) => void;
  onBackToLogin: () => void;
  existingDrivers?: Driver[];
}

export const DriverRegisterView: React.FC<DriverRegisterViewProps> = ({
  onRegisterSuccess,
  onBackToLogin,
  existingDrivers = [],
}) => {
  const [name, setName] = useState('');
  const [email, setEmail] = useState('');
  const [phone, setPhone] = useState('');
  const [password, setPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [vehiclePlate, setVehiclePlate] = useState('');
  const [vehicleModel, setVehicleModel] = useState('');
  const [vehicleYear, setVehicleYear] = useState('2024');
  const [cnh, setCnh] = useState('');
  const [category, setCategory] = useState<VehicleCategory>('economica');
  const [errorMessage, setErrorMessage] = useState<string | null>(null);

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    setErrorMessage(null);

    const cleanEmail = email.trim().toLowerCase();
    const cleanName = name.trim();
    const cleanPhone = phone.trim();
    const cleanPlate = vehiclePlate.trim().toUpperCase();
    const cleanModel = vehicleModel.trim();
    const cleanCnh = cnh.trim();

    if (!cleanName || !cleanEmail || !cleanPhone || !password || !cleanPlate || !cleanModel || !cleanCnh) {
      setErrorMessage('Por favor, preencha todos os campos obrigatórios.');
      return;
    }

    if (password.length < 6) {
      setErrorMessage('A senha deve conter no mínimo 6 dígitos.');
      return;
    }

    if (existingDrivers.some((d) => d.email.toLowerCase() === cleanEmail)) {
      setErrorMessage('Já existe um motorista cadastrado com este e-mail. Faça login para continuar.');
      return;
    }

    // Cria motorista com plano semanal vencido/pendente de R$ 200
    const newDriver: Driver = {
      id: `drv-${Date.now().toString().slice(-5)}`,
      name: cleanName,
      avatar: 'https://images.unsplash.com/photo-1534528741775-53994a69daeb?w=150&auto=format&fit=crop&q=80',
      phone: cleanPhone,
      email: cleanEmail,
      cpf: '000.***.***-00',
      cnh: `${cleanCnh} - Categoria B (EAR)`,
      category,
      vehicleModel: cleanModel,
      vehiclePlate: cleanPlate,
      vehicleColor: 'Preto',
      vehicleYear: parseInt(vehicleYear, 10) || 2024,
      rating: 5.0,
      totalRides: 0,
      status: 'offline', // Offline até pagar a taxa de R$ 200
      lat: -23.5615,
      lng: -46.6558,
      weeklyPlanActive: false,
      weeklyPlanExpiresAt: null,
      weeklyFeePaidAt: null,
      weeklyFeeExpiresAt: null,
      weeklyPlanPrice: WEEKLY_FEE,
      earningsToday: 0,
      earningsWeek: 0,
      cnhVerified: true,
      vehicleVerified: true,
      criminalRecordClear: true,
      registrationDate: new Date().toISOString().split('T')[0],
      password: password,
    };

    const appUser: AppUser = {
      id: newDriver.id,
      name: newDriver.name,
      email: newDriver.email,
      phone: newDriver.phone,
      role: 'driver',
      tipo: 'driver',
      avatar: newDriver.avatar,
      rating: 5.0,
      password: password,
      driverData: newDriver,
    };

    // Salvar no localStorage: race_current_user, race_users, race_registered_drivers
    try {
      localStorage.setItem('race_current_user', JSON.stringify({
        id: appUser.id,
        name: appUser.name,
        email: appUser.email,
        phone: appUser.phone,
        tipo: 'driver',
        role: 'driver',
        avatar: appUser.avatar,
        driverData: newDriver,
      }));

      const existingUsers = JSON.parse(localStorage.getItem('race_users') || '[]');
      const updatedUsers = [
        {
          id: appUser.id,
          name: appUser.name,
          email: appUser.email,
          phone: appUser.phone,
          tipo: 'driver',
          role: 'driver',
          password: password,
          createdAt: new Date().toISOString(),
        },
        ...existingUsers.filter((u: any) => u.email?.toLowerCase() !== cleanEmail),
      ];
      localStorage.setItem('race_users', JSON.stringify(updatedUsers));

      const existingDriversList = JSON.parse(localStorage.getItem('race_registered_drivers') || '[]');
      const updatedDrivers = [
        newDriver,
        ...existingDriversList.filter((d: any) => d.email?.toLowerCase() !== cleanEmail),
      ];
      localStorage.setItem('race_registered_drivers', JSON.stringify(updatedDrivers));
    } catch {}

    try {
      confetti({ particleCount: 70, spread: 75, origin: { y: 0.6 } });
    } catch {}

    onRegisterSuccess(appUser, newDriver);
  };

  return (
    <div className="min-h-screen bg-[#000000] text-white flex flex-col justify-center items-center px-6 py-12 selection:bg-[#ff6a00] selection:text-white">
      <div className="w-full max-w-sm sm:max-w-md space-y-6 animate-fade-in">
        {/* Topo: Título RACE em laranja e subtítulo Cadastro Motorista */}
        <div className="text-center space-y-2">
          <h1 className="text-6xl sm:text-7xl font-heading font-black text-[#ff6a00] tracking-tighter uppercase select-none">
            RACE
          </h1>
          <p className="text-zinc-300 font-medium text-base sm:text-lg tracking-wide">
            Cadastro Motorista Parceiro
          </p>
        </div>

        {/* Mensagem de Erro se houver */}
        {errorMessage && (
          <div className="bg-red-950/80 border border-red-500/80 text-red-200 text-xs sm:text-sm p-3.5 rounded-xl flex items-center gap-2 font-medium">
            <AlertTriangle className="w-4 h-4 text-red-400 shrink-0" />
            <span>{errorMessage}</span>
          </div>
        )}

        {/* Formulário com campos de motorista: Nome, Email, Celular, Senha, Placa, Modelo do carro, Ano, CNH */}
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

          {/* MODELO DO CARRO & ANO */}
          <div className="grid grid-cols-2 gap-3">
            <div className="space-y-1">
              <label className="text-white text-xs font-bold uppercase tracking-wider block">
                MODELO DO CARRO
              </label>
              <input
                type="text"
                required
                value={vehicleModel}
                onChange={(e) => setVehicleModel(e.target.value)}
                placeholder="Ex: Chevrolet Onix Plus"
                className="w-full bg-[#1a1a1a] border border-[#2a2a2a] text-white placeholder-zinc-500 rounded-xl px-3 py-2.5 text-xs focus:outline-none focus:border-[#ff6a00] transition-colors"
              />
            </div>

            <div className="space-y-1">
              <label className="text-white text-xs font-bold uppercase tracking-wider block">
                ANO
              </label>
              <input
                type="number"
                required
                min="2012"
                max="2026"
                value={vehicleYear}
                onChange={(e) => setVehicleYear(e.target.value)}
                placeholder="2024"
                className="w-full bg-[#1a1a1a] border border-[#2a2a2a] text-white placeholder-zinc-500 rounded-xl px-3 py-2.5 text-xs focus:outline-none focus:border-[#ff6a00] transition-colors"
              />
            </div>
          </div>

          {/* PLACA & CNH */}
          <div className="grid grid-cols-2 gap-3">
            <div className="space-y-1">
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

            <div className="space-y-1">
              <label className="text-white text-xs font-bold uppercase tracking-wider block">
                CNH (COM EAR)
              </label>
              <input
                type="text"
                required
                value={cnh}
                onChange={(e) => setCnh(e.target.value)}
                placeholder="01234567890"
                className="w-full bg-[#1a1a1a] border border-[#2a2a2a] text-white placeholder-zinc-500 rounded-xl px-3 py-2.5 text-xs focus:outline-none focus:border-[#ff6a00] transition-colors"
              />
            </div>
          </div>

          {/* CATEGORIA */}
          <div className="space-y-1">
            <label className="text-white text-xs font-bold uppercase tracking-wider block">
              CATEGORIA DO SERVIÇO
            </label>
            <select
              value={category}
              onChange={(e) => setCategory(e.target.value as VehicleCategory)}
              className="w-full bg-[#1a1a1a] border border-[#2a2a2a] text-white rounded-xl px-3 py-2.5 text-xs focus:outline-none focus:border-[#ff6a00] transition-colors"
            >
              <option value="economica">RACE Econômica (Carro Hatch/Sedã)</option>
              <option value="confort">RACE Confort (Sedã Médio/SUV)</option>
              <option value="moto_passageiro">RACE Moto Passageiro</option>
              <option value="moto_entrega">RACE Flash (Entregas)</option>
            </select>
          </div>

          {/* BOTÃO CADASTRAR */}
          <button
            type="submit"
            className="w-full bg-[#ff6a00] hover:bg-[#e05e00] active:scale-[0.99] text-white font-heading font-black text-base py-3.5 px-6 rounded-xl transition-all cursor-pointer shadow-lg shadow-[#ff6a00]/20 uppercase tracking-wider block mt-5"
          >
            CONCLUIR CADASTRO MOTORISTA
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
