import React, { useState } from 'react';
import { AppUser, Driver, VehicleCategory, UserTipo, UserRole } from '../types';
import { 
  Car, 
  Bike, 
  Package, 
  ArrowRight, 
  ArrowLeft, 
  CheckCircle2, 
  AlertTriangle, 
  ShieldCheck, 
  Copy, 
  Check, 
  QrCode,
  Sparkles,
  Wallet
} from 'lucide-react';
import confetti from 'canvas-confetti';
import { RACE_PIX_KEY, RACE_PIX_BANK, RACE_PIX_NAME, WEEKLY_FEE } from '../config/pricing';
import { saveUserAccount } from '../services/userService';

export type WorkCategoryKey = 
  | 'motorista_economico' 
  | 'motorista_confort' 
  | 'motoboy_passageiro' 
  | 'motoboy_entregas';

interface CategoryWorkInfo {
  key: WorkCategoryKey;
  title: string;
  subtitle: string;
  tagline: string;
  badge: string;
  pricePerKm: string;
  icon: React.ReactNode;
  vehicleCategory: VehicleCategory;
  role: 'driver' | 'motoboy';
  userTipo: UserTipo;
  modelLabel: string;
  modelPlaceholder: string;
  hasYear: boolean;
  minYear?: number;
  hasTrunkType: boolean;
  defaultModel: string;
  defaultYear: string;
}

const WORK_CATEGORIES: Record<WorkCategoryKey, CategoryWorkInfo> = {
  motorista_economico: {
    key: 'motorista_economico',
    title: 'Motorista Econômico',
    subtitle: 'Carro comum - ganhe com corridas baratas em Indaiatuba',
    tagline: 'Ideal para hatch, sedã e carros populares',
    badge: 'R$ 2,50/km • 100% dos Ganhos',
    pricePerKm: 'R$ 2,50/km',
    icon: <Car className="w-8 h-8 text-zinc-400" />,
    vehicleCategory: 'economica',
    role: 'driver',
    userTipo: 'motorista_economico',
    modelLabel: 'MODELO DO CARRO',
    modelPlaceholder: 'Ex: Chevrolet Onix, Fiat Argo, Renault Kwid',
    hasYear: true,
    minYear: 2012,
    hasTrunkType: false,
    defaultModel: 'Chevrolet Onix',
    defaultYear: '2021',
  },
  motorista_confort: {
    key: 'motorista_confort',
    title: 'Motorista Confort',
    subtitle: 'Carro novo - corridas com mais conforto e preço maior',
    tagline: 'Veículos sedã, SUV e premium ano 2020 ou superior',
    badge: 'R$ 3,50/km • Carro 2020+',
    pricePerKm: 'R$ 3,50/km',
    icon: <Car className="w-8 h-8 text-[#ff6a00]" />,
    vehicleCategory: 'confort',
    role: 'driver',
    userTipo: 'motorista_confort',
    modelLabel: 'MODELO DO CARRO (SEDÃ / SUV)',
    modelPlaceholder: 'Ex: Toyota Corolla, Honda Civic, Jeep Compass, VW T-Cross',
    hasYear: true,
    minYear: 2020, // só aceita 2020+
    hasTrunkType: false,
    defaultModel: 'Toyota Corolla',
    defaultYear: '2022',
  },
  motoboy_passageiro: {
    key: 'motoboy_passageiro',
    title: 'Motoboy Passageiro',
    subtitle: 'Moto para levar passageiro rápido',
    tagline: 'Agilidade no trânsito para corridas individuais rápidas',
    badge: 'R$ 1,80/km • Moto Táxi',
    pricePerKm: 'R$ 1,80/km',
    icon: <Bike className="w-8 h-8 text-cyan-400" />,
    vehicleCategory: 'moto_passageiro',
    role: 'motoboy',
    userTipo: 'motoboy_passageiro',
    modelLabel: 'MODELO DA MOTO',
    modelPlaceholder: 'Ex: Honda CG 160 Titan, Yamaha Fazer 250',
    hasYear: false,
    hasTrunkType: false,
    defaultModel: 'Honda CG 160 Titan',
    defaultYear: '2022',
  },
  motoboy_entregas: {
    key: 'motoboy_entregas',
    title: 'Motoboy Entregas',
    subtitle: 'Moto para entregar encomendas em Indaiatuba',
    tagline: 'Delivery de pacotes, compras, documentos e itens do comércio',
    badge: 'R$ 2,00/km • Entregas & Flash',
    pricePerKm: 'R$ 2,00/km',
    icon: <Package className="w-8 h-8 text-amber-400" />,
    vehicleCategory: 'moto_entrega',
    role: 'motoboy',
    userTipo: 'motoboy_entregas',
    modelLabel: 'MODELO DA MOTO',
    modelPlaceholder: 'Ex: Honda CG 160 Start, Yamaha Factor 150',
    hasYear: false,
    hasTrunkType: true,
    defaultModel: 'Honda CG 160 Start',
    defaultYear: '2022',
  },
};

interface DriverWorkSelectionViewProps {
  currentUser: AppUser;
  onCompleteDriverRegister: (driver: Driver) => void;
  onBackToRides: () => void;
  onRenewWeeklyPlan?: (driver?: Driver) => void;
}

export const DriverWorkSelectionView: React.FC<DriverWorkSelectionViewProps> = ({
  currentUser,
  onCompleteDriverRegister,
  onBackToRides,
  onRenewWeeklyPlan,
}) => {
  const [stage, setStage] = useState<'select_category' | 'fill_details' | 'pay_pix'>('select_category');
  const [selectedKey, setSelectedKey] = useState<WorkCategoryKey>('motorista_economico');

  // Form de detalhes operacionais do motorista
  const [plate, setPlate] = useState('RCE9C40');
  const [model, setModel] = useState('Chevrolet Onix');
  const [year, setYear] = useState('2021');
  const [cnh, setCnh] = useState('09283719280');
  const [cpf, setCpf] = useState('');
  const [pixKey, setPixKey] = useState('');
  const [trunkType, setTrunkType] = useState('Baú 80 Litros');
  const [color, setColor] = useState('Prata');
  const [errorMessage, setErrorMessage] = useState<string | null>(null);

  // Estado da tela de pagamento PIX
  const [copiedPix, setCopiedPix] = useState(false);
  const [createdDriver, setCreatedDriver] = useState<Driver | null>(null);
  const [proofSent, setProofSent] = useState(false);

  const selectedCategory = WORK_CATEGORIES[selectedKey];

  const handleSelectCategory = (key: WorkCategoryKey) => {
    setSelectedKey(key);
    const cat = WORK_CATEGORIES[key];
    setModel(cat.defaultModel);
    setYear(cat.defaultYear);
    setErrorMessage(null);
    setStage('fill_details');
  };

  const handleCopyPixKey = () => {
    try {
      navigator.clipboard.writeText(RACE_PIX_KEY);
      setCopiedPix(true);
      setTimeout(() => setCopiedPix(false), 2500);
    } catch {}
  };

  const handleSubmitDetails = (e: React.FormEvent) => {
    e.preventDefault();
    setErrorMessage(null);

    const cleanPlate = plate.trim().toUpperCase();
    const cleanModel = model.trim();
    const cleanCnh = cnh.trim();
    const yearNum = parseInt(year, 10) || 2021;

    if (!cleanPlate || !cleanModel || !cleanCnh) {
      setErrorMessage('Por favor, preencha todos os campos obrigatórios (*).');
      return;
    }

    // Validação especial de ano para Confort (2020+)
    if (selectedCategory.key === 'motorista_confort' && yearNum < 2020) {
      setErrorMessage('A categoria Motorista Confort aceita exclusivamente veículos ano 2020 ou mais novos. Verifique o ano do seu veículo.');
      return;
    }

    const newDriver: Driver = {
      id: `drv-${Date.now().toString().slice(-5)}`,
      name: currentUser.name,
      avatar: (selectedCategory.role === 'motoboy')
        ? 'https://images.unsplash.com/photo-1557862921-37829c790f19?w=150&auto=format&fit=crop&q=80'
        : 'https://images.unsplash.com/photo-1535713875002-d1d0cf377fde?w=150&auto=format&fit=crop&q=80',
      phone: currentUser.phone,
      email: currentUser.email,
      password: currentUser.password || '',
      cpf: cpf.trim() || '123.456.789-00',
      cnh: `${cleanCnh} (EAR Ativo)`,
      category: selectedCategory.vehicleCategory,
      vehicleModel: cleanModel,
      vehiclePlate: cleanPlate,
      vehicleColor: color || 'Prata',
      vehicleYear: yearNum,
      rating: 5.0,
      totalRides: 0,
      status: 'offline', // fica online após pagar ou confirmar assinatura
      lat: -23.0903,
      lng: -47.2180,
      weeklyPlanActive: false, // requer pagamento de R$ 200
      weeklyFeePaidAt: null,
      weeklyFeeExpiresAt: null,
      weeklyPlanExpiresAt: null,
      weeklyPlanPrice: WEEKLY_FEE,
      pixKey: pixKey.trim() || cpf.trim() || currentUser.phone,
      trunkType: selectedCategory.hasTrunkType ? trunkType : undefined,
      earningsToday: 0,
      earningsWeek: 0,
      cnhVerified: true,
      vehicleVerified: true,
      criminalRecordClear: true,
      registrationDate: new Date().toISOString().split('T')[0],
      comfortEligible: selectedCategory.key === 'motorista_confort',
      comfortEligibilityReason: selectedCategory.key === 'motorista_confort' ? 'Aprovado para Confort (2020+)' : undefined,
    };

    // 1. Salvar que aquele usuário agora também é motorista daquela categoria
    const updatedAccount = {
      id: currentUser.id,
      name: currentUser.name,
      email: currentUser.email,
      phone: currentUser.phone,
      password: currentUser.password,
      role: selectedCategory.role,
      tipo: selectedCategory.userTipo,
      placa: cleanPlate,
      avatar: newDriver.avatar,
      rating: 5.0,
      driverData: newDriver,
      createdAt: new Date().toISOString(),
    };

    saveUserAccount(updatedAccount, true);
    setCreatedDriver(newDriver);

    try {
      confetti({ particleCount: 60, spread: 70, origin: { y: 0.6 } });
    } catch {}

    // 2. Vai para a tela de pagamento da assinatura R$ 200 via PIX
    setStage('pay_pix');
  };

  const handleActivateDriverAfterPayment = () => {
    if (!createdDriver) return;

    // Ativa plano por 7 dias
    const activated: Driver = {
      ...createdDriver,
      status: 'online',
      weeklyPlanActive: true,
      weeklyFeePaidAt: new Date().toISOString(),
      weeklyFeeExpiresAt: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000).toISOString(),
      weeklyPlanExpiresAt: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000).toISOString(),
    };

    saveUserAccount({
      id: currentUser.id,
      name: currentUser.name,
      email: currentUser.email,
      phone: currentUser.phone,
      password: currentUser.password,
      role: selectedCategory.role,
      tipo: selectedCategory.userTipo,
      placa: activated.vehiclePlate,
      avatar: activated.avatar,
      rating: 5.0,
      driverData: activated,
      createdAt: new Date().toISOString(),
    }, true);

    onCompleteDriverRegister(activated);
    if (onRenewWeeklyPlan) onRenewWeeklyPlan(activated);
  };

  // ESTÁGIO 1: SELECIONAR COMO QUER TRABALHAR NO RACE
  if (stage === 'select_category') {
    return (
      <div className="space-y-6 max-w-xl mx-auto py-2 animate-fade-in">
        <div className="flex items-center justify-between border-b border-slate-200 pb-3">
          <button
            type="button"
            onClick={onBackToRides}
            className="text-slate-600 hover:text-slate-900 text-xs font-bold transition-all cursor-pointer flex items-center gap-1.5"
          >
            <ArrowLeft className="w-4 h-4" />
            <span>Voltar para Corridas (Passageiro)</span>
          </button>
          <span className="text-xs font-mono font-bold text-amber-700 bg-amber-50 px-2 py-0.5 rounded-full border border-amber-200">
            0% Taxas • 100% Livre
          </span>
        </div>

        <div className="text-center space-y-1.5">
          <h2 className="text-2xl sm:text-3xl font-heading font-black text-slate-950 tracking-tight">
            Quero trabalhar no Race
          </h2>
          <p className="text-xs sm:text-sm text-slate-600 font-medium">
            Escolha como você quer trabalhar em Indaiatuba com 100% dos ganhos livres:
          </p>
        </div>

        <div className="grid grid-cols-1 gap-3.5">
          {/* 1. Motorista Econômico */}
          <button
            type="button"
            onClick={() => handleSelectCategory('motorista_economico')}
            className="w-full p-4 sm:p-5 bg-white hover:bg-slate-50 border-2 border-slate-300 hover:border-slate-800 rounded-3xl transition-all cursor-pointer text-left flex items-center justify-between group shadow-sm active:scale-[0.99]"
          >
            <div className="flex items-center gap-4">
              <div className="w-14 h-14 rounded-2xl bg-slate-100 border border-slate-200 flex items-center justify-center shrink-0 group-hover:scale-105 transition-transform">
                <Car className="w-7 h-7 text-slate-700" />
              </div>
              <div>
                <div className="flex items-center gap-2">
                  <span className="font-heading font-black text-slate-950 text-base sm:text-lg">
                    Motorista Econômico
                  </span>
                  <span className="bg-slate-100 text-slate-800 text-[11px] px-2 py-0.5 rounded-full font-mono font-bold">
                    R$ 2,50/km
                  </span>
                </div>
                <p className="text-xs text-slate-600 font-medium mt-1">
                  Carro comum - ganhe com corridas baratas em Indaiatuba
                </p>
              </div>
            </div>
            <ArrowRight className="w-5 h-5 text-slate-700 shrink-0 ml-2 group-hover:translate-x-1 transition-transform" />
          </button>

          {/* 2. Motorista Confort */}
          <button
            type="button"
            onClick={() => handleSelectCategory('motorista_confort')}
            className="w-full p-4 sm:p-5 bg-[#fffaf5] hover:bg-[#fff4ea] border-2 border-[#ff6a00]/40 hover:border-[#ff6a00] rounded-3xl transition-all cursor-pointer text-left flex items-center justify-between group shadow-sm active:scale-[0.99]"
          >
            <div className="flex items-center gap-4">
              <div className="w-14 h-14 rounded-2xl bg-[#ff6a00]/15 border border-[#ff6a00]/40 flex items-center justify-center shrink-0 group-hover:scale-105 transition-transform">
                <Car className="w-7 h-7 text-[#ff6a00]" />
              </div>
              <div>
                <div className="flex items-center gap-2">
                  <span className="font-heading font-black text-slate-950 text-base sm:text-lg">
                    Motorista Confort
                  </span>
                  <span className="bg-[#ff6a00]/20 text-[#ff6a00] text-[11px] px-2 py-0.5 rounded-full font-mono font-bold border border-[#ff6a00]/30">
                    R$ 3,50/km
                  </span>
                </div>
                <p className="text-xs text-slate-600 font-medium mt-1">
                  Carro novo - corridas com mais conforto e preço maior (2020+)
                </p>
              </div>
            </div>
            <ArrowRight className="w-5 h-5 text-[#ff6a00] shrink-0 ml-2 group-hover:translate-x-1 transition-transform" />
          </button>

          {/* 3. Motoboy Passageiro */}
          <button
            type="button"
            onClick={() => handleSelectCategory('motoboy_passageiro')}
            className="w-full p-4 sm:p-5 bg-[#f6fcfe] hover:bg-[#edf9fd] border-2 border-cyan-300 hover:border-cyan-600 rounded-3xl transition-all cursor-pointer text-left flex items-center justify-between group shadow-sm active:scale-[0.99]"
          >
            <div className="flex items-center gap-4">
              <div className="w-14 h-14 rounded-2xl bg-cyan-100 border border-cyan-300 flex items-center justify-center shrink-0 group-hover:scale-105 transition-transform">
                <Bike className="w-7 h-7 text-cyan-700" />
              </div>
              <div>
                <div className="flex items-center gap-2">
                  <span className="font-heading font-black text-slate-950 text-base sm:text-lg">
                    Motoboy Passageiro
                  </span>
                  <span className="bg-cyan-100 text-cyan-800 text-[11px] px-2 py-0.5 rounded-full font-mono font-bold">
                    R$ 1,80/km
                  </span>
                </div>
                <p className="text-xs text-slate-600 font-medium mt-1">
                  Moto para levar passageiro rápido
                </p>
              </div>
            </div>
            <ArrowRight className="w-5 h-5 text-cyan-700 shrink-0 ml-2 group-hover:translate-x-1 transition-transform" />
          </button>

          {/* 4. Motoboy Entregas */}
          <button
            type="button"
            onClick={() => handleSelectCategory('motoboy_entregas')}
            className="w-full p-4 sm:p-5 bg-[#fffbf2] hover:bg-[#fff6e3] border-2 border-amber-300 hover:border-amber-600 rounded-3xl transition-all cursor-pointer text-left flex items-center justify-between group shadow-sm active:scale-[0.99]"
          >
            <div className="flex items-center gap-4">
              <div className="w-14 h-14 rounded-2xl bg-amber-100 border border-amber-300 flex items-center justify-center shrink-0 group-hover:scale-105 transition-transform">
                <Package className="w-7 h-7 text-amber-700" />
              </div>
              <div>
                <div className="flex items-center gap-2">
                  <span className="font-heading font-black text-slate-950 text-base sm:text-lg">
                    Motoboy Entregas
                  </span>
                  <span className="bg-amber-100 text-amber-900 text-[11px] px-2 py-0.5 rounded-full font-mono font-bold">
                    R$ 2,00/km
                  </span>
                </div>
                <p className="text-xs text-slate-600 font-medium mt-1">
                  Moto para entregar encomendas em Indaiatuba
                </p>
              </div>
            </div>
            <ArrowRight className="w-5 h-5 text-amber-700 shrink-0 ml-2 group-hover:translate-x-1 transition-transform" />
          </button>
        </div>
      </div>
    );
  }

  // ESTÁGIO 2: PREENCHER DADOS DO VEÍCULO (NOVO CADASTRO DE MOTORISTA PARA AQUELA OPÇÃO)
  if (stage === 'fill_details') {
    return (
      <div className="space-y-6 max-w-xl mx-auto py-2 animate-fade-in">
        <div className="flex items-center justify-between border-b border-slate-200 pb-3">
          <button
            type="button"
            onClick={() => setStage('select_category')}
            className="text-slate-600 hover:text-slate-900 text-xs font-bold transition-all cursor-pointer flex items-center gap-1.5"
          >
            <ArrowLeft className="w-4 h-4" />
            <span>Trocar categoria</span>
          </button>
          <span className="text-xs font-mono font-bold text-slate-700 bg-slate-100 px-2 py-0.5 rounded-full border border-slate-300">
            {selectedCategory.title}
          </span>
        </div>

        <div className="space-y-1">
          <h2 className="text-2xl font-heading font-black text-slate-950 tracking-tight">
            Novo Cadastro de Motorista
          </h2>
          <p className="text-xs sm:text-sm text-slate-600 font-medium">
            Opção selecionada: <strong>{selectedCategory.title}</strong> ({selectedCategory.subtitle})
          </p>
        </div>

        {errorMessage && (
          <div className="bg-rose-50 border-2 border-rose-300 text-rose-900 text-xs sm:text-sm p-4 rounded-2xl font-bold flex items-center gap-2">
            <AlertTriangle className="w-5 h-5 text-rose-600 shrink-0" />
            <span>{errorMessage}</span>
          </div>
        )}

        <form onSubmit={handleSubmitDetails} className="space-y-4 bg-white border border-slate-200 p-5 sm:p-6 rounded-3xl shadow-sm">
          {/* Dados do usuário já vinculados */}
          <div className="p-3.5 bg-slate-50 border border-slate-200 rounded-2xl text-xs space-y-1 text-slate-700">
            <span className="font-bold text-slate-900 block">Condutor Vinculado à sua Conta:</span>
            <div className="flex flex-wrap gap-x-4 gap-y-1 text-slate-600">
              <span><strong>Nome:</strong> {currentUser.name}</span>
              <span><strong>E-mail:</strong> {currentUser.email}</span>
              <span><strong>Celular:</strong> {currentUser.phone}</span>
            </div>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3.5">
            {/* Placa */}
            <div className="space-y-1">
              <label className="text-xs font-bold text-slate-700 uppercase tracking-wider block">
                Placa do Veículo *
              </label>
              <input
                type="text"
                required
                value={plate}
                onChange={(e) => setPlate(e.target.value.toUpperCase())}
                placeholder="Ex: RCE9C40"
                maxLength={8}
                className="w-full bg-slate-50 border border-slate-300 rounded-xl px-4 py-2.5 text-sm font-mono font-bold text-slate-900 focus:outline-none focus:border-amber-500 uppercase"
              />
            </div>

            {/* Modelo */}
            <div className="space-y-1">
              <label className="text-xs font-bold text-slate-700 uppercase tracking-wider block">
                {selectedCategory.modelLabel} *
              </label>
              <input
                type="text"
                required
                value={model}
                onChange={(e) => setModel(e.target.value)}
                placeholder={selectedCategory.modelPlaceholder}
                className="w-full bg-slate-50 border border-slate-300 rounded-xl px-4 py-2.5 text-sm font-medium text-slate-900 focus:outline-none focus:border-amber-500"
              />
            </div>

            {/* Ano do Veículo */}
            <div className="space-y-1">
              <label className="text-xs font-bold text-slate-700 uppercase tracking-wider block">
                Ano de Fabricação *
              </label>
              <input
                type="number"
                required
                min={selectedCategory.minYear || 2000}
                max={2026}
                value={year}
                onChange={(e) => setYear(e.target.value)}
                placeholder="Ex: 2021"
                className="w-full bg-slate-50 border border-slate-300 rounded-xl px-4 py-2.5 text-sm font-medium text-slate-900 focus:outline-none focus:border-amber-500"
              />
              {selectedCategory.key === 'motorista_confort' && (
                <span className="text-[11px] font-bold text-[#ff6a00] block mt-0.5">
                  ★ Categoria Confort: aceita veículos 2020 em diante.
                </span>
              )}
            </div>

            {/* CNH */}
            <div className="space-y-1">
              <label className="text-xs font-bold text-slate-700 uppercase tracking-wider block">
                Número da CNH (com EAR) *
              </label>
              <input
                type="text"
                required
                value={cnh}
                onChange={(e) => setCnh(e.target.value)}
                placeholder="Ex: 09283719280"
                className="w-full bg-slate-50 border border-slate-300 rounded-xl px-4 py-2.5 text-sm font-mono font-medium text-slate-900 focus:outline-none focus:border-amber-500"
              />
            </div>

            {/* Chave PIX Pessoal para Receber Corridas */}
            <div className="space-y-1 sm:col-span-2">
              <label className="text-xs font-bold text-slate-700 uppercase tracking-wider block">
                Sua Chave PIX (onde você recebe 100% da corrida) *
              </label>
              <input
                type="text"
                value={pixKey}
                onChange={(e) => setPixKey(e.target.value)}
                placeholder="Ex: seu CPF, e-mail, celular ou chave aleatória"
                className="w-full bg-slate-50 border border-slate-300 rounded-xl px-4 py-2.5 text-sm font-mono font-medium text-slate-900 focus:outline-none focus:border-amber-500"
              />
            </div>

            {/* Campo Específico para Motoboy Entregas: Tipo de Baú */}
            {selectedCategory.hasTrunkType && (
              <div className="space-y-1 sm:col-span-2">
                <label className="text-xs font-bold text-slate-700 uppercase tracking-wider block">
                  Tipo de Compartimento de Carga / Baú *
                </label>
                <select
                  value={trunkType}
                  onChange={(e) => setTrunkType(e.target.value)}
                  className="w-full bg-slate-50 border border-slate-300 rounded-xl px-4 py-2.5 text-sm font-medium text-slate-900 focus:outline-none focus:border-amber-500 cursor-pointer"
                >
                  <option value="Baú 80 Litros">Baú Homologado 80 Litros</option>
                  <option value="Baú 90 Litros">Baú Homologado 90 Litros</option>
                  <option value="Baú 120 Litros">Baú Homologado 120 Litros</option>
                  <option value="Mochila / Bag Térmica (até 20kg)">Mochila / Bag Térmica Impermeável</option>
                </select>
              </div>
            )}
          </div>

          <button
            type="submit"
            className="w-full py-4 px-6 rounded-2xl bg-[#ff6a00] hover:bg-[#e05e00] text-white font-heading font-black text-base transition-all cursor-pointer shadow-lg shadow-[#ff6a00]/20 uppercase tracking-wider block mt-4 active:scale-[0.99]"
          >
            CONCLUIR CADASTRO DE MOTORISTA
          </button>
        </form>
      </div>
    );
  }

  // ESTÁGIO 3: TELA DE ASSINATURA R$ 200 VIA PIX CONFORME SOLICITADO NO ITEM 2 DO PROMPT:
  // "Depois do cadastro, mostrar: "Agora pague R$200/semana PIX 9d9e5635-9e68-46bf-bffe-08bdae29c8ba para liberar""
  return (
    <div className="space-y-6 max-w-xl mx-auto py-2 animate-fade-in">
      <div className="bg-emerald-50 border-2 border-emerald-400 rounded-3xl p-6 sm:p-7 text-center space-y-5 shadow-sm">
        <div className="w-16 h-16 bg-emerald-100 rounded-full flex items-center justify-center mx-auto text-emerald-700 shadow-inner">
          <CheckCircle2 className="w-10 h-10" />
        </div>

        <div className="space-y-2">
          <h2 className="text-xl sm:text-2xl font-heading font-black text-slate-950">
            Cadastro de Motorista Concluído!
          </h2>
          {/* TEXTO EXATO EXIGIDO NO PROMPT */}
          <div className="p-4 bg-white border-2 border-amber-400 rounded-2xl shadow-sm">
            <p className="text-base sm:text-lg font-heading font-black text-slate-900 leading-snug">
              Agora pague R$200/semana PIX 9d9e5635-9e68-46bf-bffe-08bdae29c8ba para liberar
            </p>
          </div>
        </div>

        {/* Card de Cópia da Chave PIX */}
        <div className="bg-white border-2 border-slate-200 rounded-2xl p-4 text-left space-y-3">
          <div className="flex items-center justify-between text-xs font-heading font-black text-slate-600">
            <span>CHAVE PIX OFICIAL RACE (NUBANK)</span>
            <span className="text-emerald-700 font-mono">R$ 200,00</span>
          </div>

          <div className="flex items-center justify-between bg-slate-50 p-2.5 rounded-xl border border-slate-300">
            <span className="font-mono text-xs sm:text-sm font-black text-slate-950 select-all truncate">
              {RACE_PIX_KEY}
            </span>
            <button
              type="button"
              onClick={handleCopyPixKey}
              className="ml-2 px-3 py-1.5 bg-[#ff6a00] hover:bg-[#e05e00] text-white rounded-lg text-xs font-heading font-black flex items-center gap-1.5 cursor-pointer transition-all shrink-0"
            >
              {copiedPix ? <Check className="w-4 h-4" /> : <Copy className="w-4 h-4" />}
              <span>{copiedPix ? 'Copiado!' : 'Copiar'}</span>
            </button>
          </div>

          <div className="grid grid-cols-2 gap-2 text-[11px] text-slate-500 font-medium pt-1">
            <div>
              <span className="block font-bold text-slate-700">Banco:</span>
              <span>{RACE_PIX_BANK}</span>
            </div>
            <div>
              <span className="block font-bold text-slate-700">Favorecido:</span>
              <span>{RACE_PIX_NAME}</span>
            </div>
          </div>
        </div>

        {/* Botão de Liberação / Acesso às Corridas */}
        <div className="space-y-3 pt-2">
          <button
            type="button"
            onClick={handleActivateDriverAfterPayment}
            className="w-full py-4 px-6 rounded-2xl bg-emerald-600 hover:bg-emerald-500 text-white font-heading font-black text-base transition-all cursor-pointer shadow-lg shadow-emerald-600/20 uppercase tracking-wider block"
          >
            CONFIRMAR PAGAMENTO E LIBERAR CORRIDAS
          </button>

          <button
            type="button"
            onClick={onBackToRides}
            className="w-full py-3 px-5 rounded-2xl bg-white hover:bg-slate-100 text-slate-700 font-heading font-bold text-xs sm:text-sm border border-slate-300 transition-all cursor-pointer"
          >
            Sou passageiro (Pedir corrida)
          </button>
        </div>
      </div>
    </div>
  );
};
