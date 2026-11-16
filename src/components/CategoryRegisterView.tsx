import React, { useState } from 'react';
import { AppUser, Driver, VehicleCategory, UserTipo } from '../types';
import { WEEKLY_FEE } from '../config/pricing';
import { saveUserAccount } from '../services/userService';
import { compressImageToMax200KB } from '../utils/imageCompression';
import { isValidEmail, isValidPassword, isValidWhatsApp11 } from '../utils/security';
import { LegalConsentSection } from './LegalConsentSection';
import { 
  Car, 
  Bike, 
  Package, 
  Eye, 
  EyeOff, 
  AlertTriangle, 
  ArrowLeft, 
  CheckCircle2, 
  Sparkles,
  ShieldCheck,
  Camera
} from 'lucide-react';
import confetti from 'canvas-confetti';

export type CategoryRegisterKey = 
  | 'motorista_economico' 
  | 'motorista_confort' 
  | 'motoboy_passageiro' 
  | 'motoboy_entregas';

interface CategoryConfig {
  key: CategoryRegisterKey;
  title: string;
  subtitle: string;
  badge: string;
  badgeColor: string;
  icon: React.ReactNode;
  vehicleCategory: VehicleCategory;
  role: 'driver' | 'motoboy';
  userTipo: UserTipo;
  modelLabel: string;
  modelPlaceholder: string;
  hasYear: boolean;
  minYear?: number;
  hasTrunkType: boolean;
}

const CATEGORY_CONFIGS: Record<CategoryRegisterKey, CategoryConfig> = {
  motorista_economico: {
    key: 'motorista_economico',
    title: 'Motorista Econômico',
    subtitle: 'Carro comum - ganhe com corridas baratas em Indaiatuba',
    badge: 'R$ 2,50/km • 85% seu',
    badgeColor: 'bg-zinc-800 text-zinc-300 border-zinc-700',
    icon: <Car className="w-8 h-8 text-zinc-300" />,
    vehicleCategory: 'economica',
    role: 'driver',
    userTipo: 'motorista_economico',
    modelLabel: 'MODELO DO CARRO',
    modelPlaceholder: 'Ex: Chevrolet Onix, Fiat Argo, Renault Kwid',
    hasYear: true,
    minYear: 2012,
    hasTrunkType: false,
  },
  motorista_confort: {
    key: 'motorista_confort',
    title: 'Motorista Confort',
    subtitle: 'Carro novo - corridas com mais conforto e preço maior',
    badge: 'R$ 3,50/km • Carro 2020+',
    badgeColor: 'bg-[#ff6a00]/20 text-[#ff6a00] border-[#ff6a00]/50',
    icon: <Car className="w-8 h-8 text-[#ff6a00]" />,
    vehicleCategory: 'confort',
    role: 'driver',
    userTipo: 'motorista_confort',
    modelLabel: 'MODELO DO CARRO (SEDÃ / SUV)',
    modelPlaceholder: 'Ex: Toyota Corolla, Honda Civic, Jeep Compass, VW T-Cross',
    hasYear: true,
    minYear: 2020, // Só aceita 2020+
    hasTrunkType: false,
  },
  motoboy_passageiro: {
    key: 'motoboy_passageiro',
    title: 'Motoboy Passageiro',
    subtitle: 'Moto para levar passageiro rápido',
    badge: 'R$ 1,80/km • Moto Táxi',
    badgeColor: 'bg-cyan-950/70 text-cyan-400 border-cyan-800',
    icon: <Bike className="w-8 h-8 text-cyan-400" />,
    vehicleCategory: 'moto_passageiro',
    role: 'motoboy',
    userTipo: 'motoboy_passageiro',
    modelLabel: 'MODELO DA MOTO',
    modelPlaceholder: 'Ex: Honda CG 160 Titan, Yamaha Fazer 250, Honda Bros',
    hasYear: false,
    hasTrunkType: false,
  },
  motoboy_entregas: {
    key: 'motoboy_entregas',
    title: 'Motoboy Entregas',
    subtitle: 'Moto para entregar encomendas em Indaiatuba',
    badge: 'R$ 2,00/km • Flash & Delivery',
    badgeColor: 'bg-amber-950/70 text-amber-400 border-amber-800',
    icon: <Package className="w-8 h-8 text-amber-400" />,
    vehicleCategory: 'moto_entrega',
    role: 'motoboy',
    userTipo: 'motoboy_entregas',
    modelLabel: 'MODELO DA MOTO',
    modelPlaceholder: 'Ex: Honda CG 160 Start, Yamaha Factor 150',
    hasYear: false,
    hasTrunkType: true,
  },
};

interface CategoryRegisterViewProps {
  categoryKey: CategoryRegisterKey;
  existingDrivers?: Driver[];
  onRegisterSuccess: (user: AppUser, newDriver: Driver) => void;
  onBackToOptions: () => void;
}

export const CategoryRegisterView: React.FC<CategoryRegisterViewProps> = ({
  categoryKey,
  existingDrivers = [],
  onRegisterSuccess,
  onBackToOptions,
}) => {
  const config = CATEGORY_CONFIGS[categoryKey];

  const [name, setName] = useState('');
  const [email, setEmail] = useState('');
  const [phone, setPhone] = useState('');
  const [password, setPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [vehiclePlate, setVehiclePlate] = useState('');
  const [vehicleModel, setVehicleModel] = useState('');
  const [vehicleYear, setVehicleYear] = useState(config.minYear ? String(config.minYear) : '2022');
  const [trunkType, setTrunkType] = useState('Baú 80 Litros');
  const [avatar, setAvatar] = useState('');
  const [acceptedContract, setAcceptedContract] = useState(false);
  const [acceptedTerms, setAcceptedTerms] = useState(false);
  const [acceptedLgpd, setAcceptedLgpd] = useState(false);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);

  const handleAvatarUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    const reader = new FileReader();
    reader.onloadend = async () => {
      if (typeof reader.result === 'string') {
        const compressed = await compressImageToMax200KB(reader.result);
        setAvatar(compressed);
      }
    };
    reader.readAsDataURL(file);
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    setErrorMessage(null);

    const cleanEmail = email.trim().toLowerCase();
    const cleanName = name.trim();
    const cleanPhone = phone.trim();
    const cleanPlate = vehiclePlate.trim().toUpperCase();
    const cleanModel = vehicleModel.trim();

    if (!cleanName || !cleanEmail || !cleanPhone || !password || !cleanPlate || !cleanModel) {
      setErrorMessage('Por favor, preencha todos os campos obrigatórios.');
      return;
    }

    if (!avatar) {
      setErrorMessage('Envie uma foto de perfil obrigatória antes de concluir o cadastro.');
      return;
    }

    if (!isValidEmail(cleanEmail)) {
      setErrorMessage('E-mail inválido! Digite um e-mail válido (ex: nome@dominio.com).');
      return;
    }

    if (!isValidWhatsApp11(cleanPhone)) {
      setErrorMessage('WhatsApp inválido! Digite exatamente 11 dígitos com DDD + 9 (ex: 19999999999).');
      return;
    }

    if (!isValidPassword(password)) {
      setErrorMessage('A senha deve conter no mínimo 6 dígitos.');
      return;
    }

    if (!acceptedContract || !acceptedTerms || !acceptedLgpd) {
      setErrorMessage('Você deve ler e aceitar o Contrato de Parceria, os Termos de Uso e a Política de Privacidade (LGPD) antes de salvar.');
      return;
    }

    // Validação especial de ano para Confort (só aceita 2020+)
    if (config.key === 'motorista_confort') {
      const yearNum = parseInt(vehicleYear, 10) || 0;
      if (yearNum < 2020) {
        setErrorMessage('A categoria Confort só aceita carros ano 2020 ou mais novos.');
        return;
      }
    }

    if (existingDrivers.some((d) => d.email.toLowerCase() === cleanEmail)) {
      setErrorMessage('Já existe um parceiro cadastrado com este e-mail. Faça login para continuar.');
      return;
    }

    const yearNum = config.hasYear ? (parseInt(vehicleYear, 10) || 2024) : 2023;

    // Cria o motorista / motoboy vinculado à categoria escolhida
    const newDriver: Driver = {
      id: '',
      name: cleanName,
      avatar: avatar,
      phone: cleanPhone,
      email: cleanEmail,
      cpf: '',
      cnh: '',
      category: config.vehicleCategory,
      vehicleModel: cleanModel,
      vehiclePlate: cleanPlate,
      vehicleColor: '',
      vehicleYear: yearNum,
      rating: 0,
      totalRides: 0,
      status: 'online', // Sem taxa para trabalhar, ativo imediatamente
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
      trunkType: config.hasTrunkType ? trunkType : undefined,
    };

    const appUser: AppUser = {
      id: newDriver.id,
      name: newDriver.name,
      email: newDriver.email,
      phone: newDriver.phone,
      role: config.role,
      tipo: config.userTipo,
      placa: newDriver.vehiclePlate,
      avatar: avatar,
      rating: 0,
      driverData: newDriver,
    };

    // Salva direto no Supabase (sem armazenar senha no localStorage)
    saveUserAccount({
      id: newDriver.id,
      name: newDriver.name,
      email: newDriver.email,
      phone: newDriver.phone,
      role: config.role,
      tipo: config.userTipo,
      placa: newDriver.vehiclePlate,
      password: password,
      avatar: avatar,
      rating: 0,
      driverData: newDriver,
      rides: [],
      createdAt: new Date().toISOString(),
      aceitou_contrato: true,
      aceitou_termos: true,
      aceitou_lgpd: true,
      data_aceite: new Date().toISOString(),
    }, false);

    try {
      confetti({ particleCount: 75, spread: 80, origin: { y: 0.6 } });
    } catch {}

    onRegisterSuccess(appUser, newDriver);
  };

  return (
    <div className="min-h-screen bg-[#000000] text-white flex flex-col justify-center items-center px-6 py-12 selection:bg-[#ff6a00] selection:text-white">
      <div className="w-full max-w-sm sm:max-w-md space-y-6 animate-fade-in">
        {/* Cabeçalho de Volta */}
        <div className="flex items-center justify-between border-b border-zinc-800 pb-3">
          <button
            type="button"
            onClick={onBackToOptions}
            className="text-zinc-400 hover:text-white text-xs font-bold transition-all cursor-pointer flex items-center gap-1.5"
          >
            <ArrowLeft className="w-4 h-4" />
            <span>Voltar às opções</span>
          </button>
          <span className="text-[11px] font-mono font-bold text-[#ff6a00] uppercase">
            Passo 1 de 2: Cadastro
          </span>
        </div>

        {/* Informações da Categoria Escolhida */}
        <div className="bg-[#121212] border border-zinc-800 rounded-2xl p-4 flex items-center gap-3.5 shadow-md">
          <div className="w-13 h-13 rounded-2xl bg-zinc-900 border border-zinc-700 flex items-center justify-center shrink-0">
            {config.icon}
          </div>
          <div>
            <div className="flex items-center gap-2">
              <h2 className="font-heading font-black text-white text-lg">
                {config.title}
              </h2>
              <span className={`text-[10px] font-mono font-bold px-2 py-0.5 rounded-full border ${config.badgeColor}`}>
                {config.badge}
              </span>
            </div>
            <p className="text-xs text-zinc-400 font-medium mt-0.5">
              {config.subtitle}
            </p>
          </div>
        </div>

        {/* Mensagem de Erro se houver */}
        {errorMessage && (
          <div className="bg-red-950/80 border border-red-500/80 text-red-200 text-xs sm:text-sm p-3.5 rounded-xl flex items-center gap-2 font-medium">
            <AlertTriangle className="w-4 h-4 text-red-400 shrink-0" />
            <span>{errorMessage}</span>
          </div>
        )}

        {/* Formulário Específico da Categoria */}
        <form onSubmit={handleSubmit} className="space-y-3.5">
          <div className="flex items-center gap-3 bg-[#1a1a1a] border border-[#2a2a2a] rounded-xl p-3">
            <label className="w-12 h-12 rounded-full bg-zinc-900 border-2 border-[#ff6a00] flex items-center justify-center overflow-hidden cursor-pointer shrink-0">
              {avatar ? <img src={avatar} alt="Foto" className="w-full h-full object-cover" /> : <Camera className="w-5 h-5 text-[#ff6a00]" />}
              <input type="file" accept="image/*" onChange={handleAvatarUpload} className="hidden" />
            </label>
            <div className="text-xs">
              <span className="font-bold text-white block">FOTO DE PERFIL * (OBRIGATÓRIA)</span>
              <span className="text-zinc-400">{avatar ? 'Foto anexada' : 'Toque ao lado para enviar'}</span>
            </div>
          </div>

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
                placeholder="(19) 98765-4321"
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

          {/* PLACA & MODELO DO VEÍCULO */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            <div className="space-y-1">
              <label className="text-white text-xs font-bold uppercase tracking-wider block">
                PLACA DO VEÍCULO
              </label>
              <input
                type="text"
                required
                value={vehiclePlate}
                onChange={(e) => setVehiclePlate(e.target.value)}
                placeholder="Ex: BRA2E19"
                className="w-full bg-[#1a1a1a] border border-[#2a2a2a] text-white placeholder-zinc-500 rounded-xl px-3 py-2.5 text-sm focus:outline-none focus:border-[#ff6a00] transition-colors uppercase font-mono"
              />
            </div>

            <div className="space-y-1">
              <label className="text-white text-xs font-bold uppercase tracking-wider block">
                {config.modelLabel}
              </label>
              <input
                type="text"
                required
                value={vehicleModel}
                onChange={(e) => setVehicleModel(e.target.value)}
                placeholder={config.modelPlaceholder}
                className="w-full bg-[#1a1a1a] border border-[#2a2a2a] text-white placeholder-zinc-500 rounded-xl px-3 py-2.5 text-sm focus:outline-none focus:border-[#ff6a00] transition-colors"
              />
            </div>
          </div>

          {/* ANO DO CARRO (Apenas para Motorista Econômico e Confort) */}
          {config.hasYear && (
            <div className="space-y-1">
              <div className="flex items-center justify-between">
                <label className="text-white text-xs font-bold uppercase tracking-wider block">
                  ANO DO CARRO
                </label>
                {config.key === 'motorista_confort' && (
                  <span className="text-[10px] text-amber-400 font-bold bg-amber-400/10 px-2 py-0.5 rounded-full border border-amber-400/30">
                    Obrigatório ano 2020 ou mais novo
                  </span>
                )}
              </div>
              <input
                type="number"
                required
                min={config.minYear || 2012}
                max={2026}
                value={vehicleYear}
                onChange={(e) => setVehicleYear(e.target.value)}
                placeholder={config.minYear ? String(config.minYear) : '2024'}
                className={`w-full bg-[#1a1a1a] border ${
                  config.key === 'motorista_confort' && parseInt(vehicleYear, 10) < 2020
                    ? 'border-red-500 focus:border-red-500'
                    : 'border-[#2a2a2a] focus:border-[#ff6a00]'
                } text-white placeholder-zinc-500 rounded-xl px-4 py-2.5 text-sm focus:outline-none transition-colors font-mono`}
              />
              {config.key === 'motorista_confort' && parseInt(vehicleYear, 10) < 2020 && (
                <p className="text-xs text-red-400 font-medium">
                  A categoria Confort só aceita veículos a partir do ano 2020.
                </p>
              )}
            </div>
          )}

          {/* TIPO DE BAÚ (Apenas para Motoboy Entregas) */}
          {config.hasTrunkType && (
            <div className="space-y-1">
              <label className="text-white text-xs font-bold uppercase tracking-wider block">
                TIPO DE BAÚ / BAG DE ENTREGA
              </label>
              <select
                value={trunkType}
                onChange={(e) => setTrunkType(e.target.value)}
                className="w-full bg-[#1a1a1a] border border-[#2a2a2a] text-white rounded-xl px-3 py-2.5 text-sm focus:outline-none focus:border-[#ff6a00] transition-colors"
              >
                <option value="Baú 80 Litros">Baú 80 Litros (Padrão Indaiatuba)</option>
                <option value="Baú 120 Litros">Baú 120 Litros (Grande Capacidade)</option>
                <option value="Mochila / Bag Térmica">Mochila / Bag Térmica (Delivery & Lanches)</option>
                <option value="Baú de Alumínio">Baú de Alumínio Reforçado</option>
                <option value="Mochila Padrão">Mochila Padrão</option>
              </select>
            </div>
          )}

          {/* Informativo do Modelo 85% Motorista / 15% Race */}
          <div className="bg-[#141414] border border-emerald-500/40 rounded-xl p-3 text-xs text-zinc-300 space-y-1">
            <div className="flex items-center gap-1.5 text-emerald-400 font-bold">
              <ShieldCheck className="w-4 h-4 text-emerald-400" />
              <span>Sem mensalidade, sem taxa para trabalhar</span>
            </div>
            <p className="text-[11px] text-zinc-300">
              Você fica com <strong className="text-emerald-400">85%</strong> de cada corrida, Race fica com <strong className="text-[#ff6a00]">15%</strong> — repasse toda sexta-feira direto na sua chave PIX!
            </p>
          </div>

          <LegalConsentSection
            acceptedContract={acceptedContract}
            acceptedTerms={acceptedTerms}
            acceptedLgpd={acceptedLgpd}
            onChangeContract={setAcceptedContract}
            onChangeTerms={setAcceptedTerms}
            onChangeLgpd={setAcceptedLgpd}
            theme="dark"
          />

          {/* BOTÃO CONCLUIR CADASTRO */}
          <button
            type="submit"
            disabled={!acceptedContract || !acceptedTerms || !acceptedLgpd}
            className={`w-full font-heading font-black text-base py-3.5 px-6 rounded-xl transition-all uppercase tracking-wider block mt-4 ${
              acceptedContract && acceptedTerms && acceptedLgpd
                ? 'bg-blue-600 hover:bg-blue-500 active:scale-[0.99] text-white cursor-pointer shadow-lg shadow-blue-600/25'
                : 'bg-zinc-800 text-zinc-500 cursor-not-allowed border border-zinc-700 opacity-60'
            }`}
          >
            {acceptedContract && acceptedTerms && acceptedLgpd
              ? 'CONCLUIR CADASTRO & COMEÇAR A DIRIGIR'
              : 'ACEITE CONTRATO, TERMOS E LGPD PARA SALVAR'}
          </button>

          {/* Voltar para opções */}
          <div className="text-center pt-1">
            <button
              type="button"
              onClick={onBackToOptions}
              className="text-[#ff6a00] hover:underline text-xs font-bold transition-all cursor-pointer inline-flex items-center gap-1"
            >
              <ArrowLeft className="w-3.5 h-3.5" />
              <span>Escolher outra categoria</span>
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};
