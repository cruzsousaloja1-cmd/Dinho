import React, { useState } from 'react';
import { AppUser, Driver, VehicleCategory, UserTipo } from '../types';
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
  Sparkles,
  ChevronDown,
  ChevronUp,
  FileText,
  Shield,
  Info,
  CheckSquare,
  Square,
  Award,
  Clock
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
  keyHighlights: string[];
  driverRequirements: string[];
  vehicleRequirements: string[];
  safetyRequirements: string[];
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
    modelPlaceholder: 'Ex: Chevrolet Onix, Fiat Argo, Renault Kwid, Hyundai HB20',
    hasYear: true,
    minYear: 2012,
    hasTrunkType: false,
    defaultModel: 'Chevrolet Onix',
    defaultYear: '2021',
    keyHighlights: [
      'CNH com anotação EAR ativa',
      'Carro 4 portas com Ar-condicionado',
      'Ano 2012 ou superior',
      '100% dos ganhos livres (R$ 2,50/km)'
    ],
    driverRequirements: [
      'CNH definitiva com anotação EAR (Exerce Atividade Remunerada) ativa',
      'Atestado de antecedentes criminais sem apontamentos impeditivos',
      'Idade mínima de 21 anos completos',
      'Cadastro de CPF regularizado na Receita Federal'
    ],
    vehicleRequirements: [
      'Veículo de passeio (hatch, sedã ou minivan) com 4 portas',
      'Capacidade legal para 5 ocupantes (motorista + 4 passageiros)',
      'Ano de fabricação 2012 ou mais novo devidamente licenciado',
      'Ar-condicionado em pleno funcionamento',
      'Cintos de segurança de 3 pontos para todos os ocupantes',
      'Documento do veículo (CRLV) vigente e em dia'
    ],
    safetyRequirements: [
      'Suporte veicular seguro para smartphone com carregador veicular',
      'Pneus em excelente estado de rodagem (sem desgaste no TWI) e estepe calibrado',
      'Chave PIX cadastrada para recebimento direto de 100% das corridas'
    ],
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
    modelPlaceholder: 'Ex: Toyota Corolla, Honda Civic, Jeep Compass, VW T-Cross, Renegade, Virtus',
    hasYear: true,
    minYear: 2020, // Validação estrita: 2020 em diante
    hasTrunkType: false,
    defaultModel: 'Toyota Corolla',
    defaultYear: '2022',
    keyHighlights: [
      'Carro ano 2020 ou superior (Obrigatório)',
      'Sedã médio/grande, SUV ou premium',
      'Ar-condicionado obrigatório sempre',
      'R$ 3,50/km • Alta rentabilidade'
    ],
    driverRequirements: [
      'CNH definitiva com anotação EAR (Exerce Atividade Remunerada) ativa',
      'Atestado de antecedentes criminais sem restrições',
      'Histórico de condução exemplar e postura cordial',
      'Manter nota mínima média de avaliação (4.85 ou superior)'
    ],
    vehicleRequirements: [
      'Veículo ano de fabricação 2020 em diante (Validação estrita)',
      'Modelos sedã médio/grande, SUV ou premium (Corolla, Civic, Compass, T-Cross, Tracker, Virtus, Nivus, etc.)',
      '4 portas, ar-condicionado em perfeito estado gelando em todas as viagens',
      'Porta-malas espaçoso livre e disponível para malas dos passageiros',
      'Interior impecável, estofamento sem avarias e bancos limpos',
      'CRLV atualizado e licenciado'
    ],
    safetyRequirements: [
      'Carregador de celular (USB / Tipo C / Lightning) disponível para o passageiro',
      'Vidros elétricos nas 4 portas e travas elétricas ativas',
      'Chave PIX própria para recebimento de 100% da tarifa sem retenções'
    ],
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
    modelPlaceholder: 'Ex: Honda CG 160 Titan, Yamaha Fazer 250, Honda Bros, Factor 150',
    hasYear: false,
    hasTrunkType: false,
    defaultModel: 'Honda CG 160 Titan',
    defaultYear: '2022',
    keyHighlights: [
      'CNH categoria A definitiva com EAR',
      '2 Capacetes INMETRO com viseira',
      'Toucas descartáveis obrigatórias',
      'R$ 1,80/km • Moto Táxi rápido'
    ],
    driverRequirements: [
      'CNH categoria A definitiva há pelo menos 2 anos com anotação EAR',
      'Certidão de antecedentes criminais sem restrições',
      'Uso obrigatório de colete ou vestimenta com faixas retrorrefletivas',
      'Idade mínima de 21 anos completos'
    ],
    vehicleRequirements: [
      'Motocicleta entre 125cc e 300cc em perfeito estado mecânico e de conservação',
      'Alças laterais ou traseiras firmes para apoio do passageiro',
      'Pedaleiras traseiras emborrachadas e firmes para a garupa',
      'Pneus novos ou meia-vida com sulcos dentro do limite de segurança',
      'CRLV da moto regularizado e licenciado'
    ],
    safetyRequirements: [
      '2 Capacetes com selo INMETRO e viseiras transparentes sem riscos (1 condutor + 1 passageiro)',
      'Fornecimento obrigatório de touca higiênica descartável a cada passageiro transportado',
      'Suporte de guidão firme e resistente a intempéries para navegação GPS',
      'Chave PIX para repasse instantâneo de 100% das corridas'
    ],
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
    modelPlaceholder: 'Ex: Honda CG 160 Start, Yamaha Factor 150, Honda Bros',
    hasYear: false,
    hasTrunkType: true,
    defaultModel: 'Honda CG 160 Start',
    defaultYear: '2022',
    keyHighlights: [
      'CNH categoria A com EAR',
      'Baú 80L/90L/120L ou Bag Térmica',
      'Entregas de encomendas e compras',
      'R$ 2,00/km • Flash & Delivery'
    ],
    driverRequirements: [
      'CNH categoria A com anotação EAR ativa',
      'Certidão de antecedentes criminais sem restrições',
      'Idade mínima de 21 anos',
      'Compromisso com o cuidado, integridade e rapidez na entrega das encomendas'
    ],
    vehicleRequirements: [
      'Motocicleta licenciada em perfeitas condições de rodagem',
      'Compartimento de carga homologado pelo CONTRAN: Baú rígido fixado (80L, 90L ou 120L) ou Mochila/Bag térmica impermeável (até 20kg)',
      'Faixas retrorrefletivas de segurança regulamentadas afixadas no compartimento',
      'Proibição expressa de transporte de passageiro simultaneamente à carga'
    ],
    safetyRequirements: [
      'Capacete com selo do INMETRO e faixas refletivas',
      'Capa de proteção contra chuva e suporte estanque para smartphone',
      'Chave PIX pessoal para recebimento integral do valor do frete'
    ],
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

  // Estado para expandir detalhes de exigências nos cards
  const [expandedCardKey, setExpandedCardKey] = useState<WorkCategoryKey | null>(null);

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

  // Checklist de confirmação de exigências para autorizar o cadastro
  const [checkCnhEar, setCheckCnhEar] = useState(false);
  const [checkVehicleReq, setCheckVehicleReq] = useState(false);
  const [checkSafetyEquipment, setCheckSafetyEquipment] = useState(false);
  const [checkWeeklyFeeAwareness, setCheckWeeklyFeeAwareness] = useState(false);

  // Estado da tela de pagamento PIX
  const [copiedPix, setCopiedPix] = useState(false);
  const [createdDriver, setCreatedDriver] = useState<Driver | null>(null);

  const selectedCategory = WORK_CATEGORIES[selectedKey];

  const handleSelectCategory = (key: WorkCategoryKey) => {
    setSelectedKey(key);
    const cat = WORK_CATEGORIES[key];
    setModel(cat.defaultModel);
    setYear(cat.defaultYear);
    setErrorMessage(null);
    setCheckCnhEar(false);
    setCheckVehicleReq(false);
    setCheckSafetyEquipment(false);
    setCheckWeeklyFeeAwareness(false);
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
      setErrorMessage('A categoria Motorista Confort exige exclusivamente veículos ano 2020 ou mais novos. Verifique o ano do veículo para autorizar.');
      return;
    }

    // Validação obrigatória dos 4 checkboxes de conformidade e autorização
    if (!checkCnhEar || !checkVehicleReq || !checkSafetyEquipment || !checkWeeklyFeeAwareness) {
      setErrorMessage('Para autorizar o cadastro, é obrigatório ler e confirmar todos os 4 requisitos e declarações de conformidade abaixo.');
      return;
    }

    const newDriver: Driver = {
      id: `drv-${Date.now().toString().slice(-5)}`,
      name: currentUser.name,
      avatar: currentUser.avatar || ((selectedCategory.role === 'motoboy')
        ? 'https://images.unsplash.com/photo-1557862921-37829c790f19?w=150&auto=format&fit=crop&q=80'
        : 'https://images.unsplash.com/photo-1535713875002-d1d0cf377fde?w=150&auto=format&fit=crop&q=80'),
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
      vehiclePhoto: selectedCategory.role === 'motoboy'
        ? 'https://images.unsplash.com/photo-1558981403-c5f9899a28bc?w=500&auto=format&fit=crop&q=80'
        : (selectedCategory.key === 'motorista_confort'
          ? 'https://images.unsplash.com/photo-1621007947382-bb3c3994e3fb?w=500&auto=format&fit=crop&q=80'
          : 'https://images.unsplash.com/photo-1549399542-7e3f8b79c341?w=500&auto=format&fit=crop&q=80'),
      rating: 5.0,
      totalRides: 0,
      status: 'offline', // Fica online após pagar ou confirmar assinatura
      lat: -23.0903,
      lng: -47.2180,
      weeklyPlanActive: false, // Requer pagamento de R$ 200
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

    // Salvar que aquele usuário agora também é motorista daquela categoria
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

    // Transição para tela de pagamento da assinatura R$ 200 via PIX
    setStage('pay_pix');
  };

  const handleActivateDriverAfterPayment = () => {
    if (!createdDriver) return;

    // Ativa plano semanal por 7 dias
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

  // ESTÁGIO 1: SELECIONAR COMO QUER TRABALHAR NO RACE COM TODAS AS EXIGÊNCIAS VISÍVEIS
  if (stage === 'select_category') {
    return (
      <div className="space-y-6 max-w-2xl mx-auto py-2 animate-fade-in">
        {/* Topo com navegação */}
        <div className="flex items-center justify-between border-b border-slate-200 pb-3">
          <button
            type="button"
            onClick={onBackToRides}
            className="text-slate-600 hover:text-slate-900 text-xs font-bold transition-all cursor-pointer flex items-center gap-1.5"
          >
            <ArrowLeft className="w-4 h-4" />
            <span>Voltar para Corridas (Passageiro)</span>
          </button>
          <span className="text-xs font-mono font-bold text-amber-700 bg-amber-50 px-2.5 py-1 rounded-full border border-amber-200">
            0% Comissões • 100% dos Ganhos Livres
          </span>
        </div>

        {/* Título e orientações */}
        <div className="text-center space-y-1.5">
          <h2 className="text-2xl sm:text-3xl font-heading font-black text-slate-950 tracking-tight">
            Quero trabalhar no Race
          </h2>
          <p className="text-xs sm:text-sm text-slate-600 font-medium max-w-lg mx-auto">
            Escolha uma das 4 opções abaixo. Confira as exigências de condutor e veículo para autorizar o seu credenciamento oficial em Indaiatuba:
          </p>
        </div>

        {/* Lista com os 4 Cards com Exigências Completas */}
        <div className="grid grid-cols-1 gap-4">
          {(Object.keys(WORK_CATEGORIES) as WorkCategoryKey[]).map((catKey) => {
            const cat = WORK_CATEGORIES[catKey];
            const isExpanded = expandedCardKey === catKey;

            return (
              <div
                key={cat.key}
                className={`bg-white border-2 rounded-3xl p-5 transition-all shadow-sm ${
                  catKey === 'motorista_confort'
                    ? 'border-[#ff6a00]/40 hover:border-[#ff6a00] bg-[#fffaf5]'
                    : catKey === 'motoboy_passageiro'
                    ? 'border-cyan-300 hover:border-cyan-500 bg-[#f7fdff]'
                    : catKey === 'motoboy_entregas'
                    ? 'border-amber-300 hover:border-amber-500 bg-[#fffdf7]'
                    : 'border-slate-300 hover:border-slate-800'
                }`}
              >
                {/* Cabeçalho do Card */}
                <div className="flex items-start justify-between gap-3">
                  <div className="flex items-center gap-3.5">
                    <div className="w-14 h-14 rounded-2xl bg-white border border-slate-200 flex items-center justify-center shrink-0 shadow-xs">
                      {cat.icon}
                    </div>
                    <div>
                      <div className="flex flex-wrap items-center gap-2">
                        <h3 className="font-heading font-black text-slate-950 text-base sm:text-lg">
                          {cat.title}
                        </h3>
                        <span className="text-xs font-mono font-bold px-2.5 py-0.5 rounded-full bg-slate-900 text-white">
                          {cat.pricePerKm}
                        </span>
                      </div>
                      <p className="text-xs sm:text-sm text-slate-700 font-medium mt-0.5">
                        {cat.subtitle}
                      </p>
                    </div>
                  </div>
                </div>

                {/* Destaques das Exigências Obrigatórias */}
                <div className="mt-4 pt-3 border-t border-slate-200/80">
                  <div className="flex items-center gap-1.5 text-xs font-bold text-slate-900 uppercase tracking-wider mb-2">
                    <ShieldCheck className="w-4 h-4 text-emerald-600 shrink-0" />
                    <span>Exigências Principais para Autorização:</span>
                  </div>

                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 text-xs">
                    {cat.keyHighlights.map((highlight, idx) => (
                      <div key={idx} className="flex items-center gap-2 text-slate-700 font-medium">
                        <Check className="w-3.5 h-3.5 text-emerald-600 shrink-0" />
                        <span>{highlight}</span>
                      </div>
                    ))}
                  </div>
                </div>

                {/* Acordeão: Ver Exigências Completas */}
                <div className="mt-3.5">
                  <button
                    type="button"
                    onClick={() => setExpandedCardKey(isExpanded ? null : catKey)}
                    className="text-xs font-bold text-amber-700 hover:text-amber-800 flex items-center gap-1 cursor-pointer transition-colors"
                  >
                    <Info className="w-3.5 h-3.5" />
                    <span>{isExpanded ? 'Ocultar exigências completas' : 'Ver todas as exigências detalhadas desta categoria'}</span>
                    {isExpanded ? <ChevronUp className="w-3.5 h-3.5" /> : <ChevronDown className="w-3.5 h-3.5" />}
                  </button>

                  {isExpanded && (
                    <div className="mt-3 p-4 bg-white/90 rounded-2xl border border-slate-200 space-y-3 text-xs animate-fade-in">
                      {/* 1. Condutor */}
                      <div>
                        <span className="font-bold text-slate-900 block mb-1">
                          1. Requisitos Obrigatórios do Condutor:
                        </span>
                        <ul className="list-disc list-inside space-y-0.5 text-slate-600 pl-1">
                          {cat.driverRequirements.map((req, rIdx) => (
                            <li key={rIdx}>{req}</li>
                          ))}
                        </ul>
                      </div>

                      {/* 2. Veículo */}
                      <div>
                        <span className="font-bold text-slate-900 block mb-1">
                          2. Requisitos Técnicos do Veículo:
                        </span>
                        <ul className="list-disc list-inside space-y-0.5 text-slate-600 pl-1">
                          {cat.vehicleRequirements.map((req, rIdx) => (
                            <li key={rIdx}>{req}</li>
                          ))}
                        </ul>
                      </div>

                      {/* 3. Equipamentos */}
                      <div>
                        <span className="font-bold text-slate-900 block mb-1">
                          3. Equipamentos e Itens de Segurança:
                        </span>
                        <ul className="list-disc list-inside space-y-0.5 text-slate-600 pl-1">
                          {cat.safetyRequirements.map((req, rIdx) => (
                            <li key={rIdx}>{req}</li>
                          ))}
                        </ul>
                      </div>
                    </div>
                  )}
                </div>

                {/* Botão de Ação: Selecionar e Abrir Cadastro */}
                <div className="mt-4 pt-3 border-t border-slate-200/80 flex items-center justify-between">
                  <span className="text-[11px] text-slate-500 font-mono">
                    Assinatura: R$ 200/semana após homologação
                  </span>

                  <button
                    type="button"
                    onClick={() => handleSelectCategory(catKey)}
                    className="px-5 py-2.5 rounded-xl bg-slate-950 hover:bg-[#ff6a00] text-white font-heading font-black text-xs sm:text-sm transition-all cursor-pointer flex items-center gap-2 shadow-sm group active:scale-95"
                  >
                    <span>CADASTRAR NESTA OPÇÃO</span>
                    <ArrowRight className="w-4 h-4 group-hover:translate-x-1 transition-transform" />
                  </button>
                </div>
              </div>
            );
          })}
        </div>
      </div>
    );
  }

  // ESTÁGIO 2: NOVO CADASTRO DE MOTORISTA COM TODAS AS EXIGÊNCIAS PARA AUTORIZAR O CADASTRO
  if (stage === 'fill_details') {
    return (
      <div className="space-y-6 max-w-2xl mx-auto py-2 animate-fade-in">
        {/* Navegação e Categoria Ativa */}
        <div className="flex items-center justify-between border-b border-slate-200 pb-3">
          <button
            type="button"
            onClick={() => setStage('select_category')}
            className="text-slate-600 hover:text-slate-900 text-xs font-bold transition-all cursor-pointer flex items-center gap-1.5"
          >
            <ArrowLeft className="w-4 h-4" />
            <span>Trocar categoria</span>
          </button>
          <div className="flex items-center gap-2">
            <span className="text-xs font-mono font-bold text-slate-900 bg-amber-100 border border-amber-300 px-3 py-1 rounded-full">
              {selectedCategory.title}
            </span>
          </div>
        </div>

        {/* Título Principal */}
        <div className="space-y-1">
          <h2 className="text-2xl font-heading font-black text-slate-950 tracking-tight">
            Novo Cadastro de Motorista
          </h2>
          <p className="text-xs sm:text-sm text-slate-600 font-medium">
            Modalidade: <strong>{selectedCategory.title}</strong> &bull; {selectedCategory.subtitle}
          </p>
        </div>

        {/* Mensagem de Erro / Alerta */}
        {errorMessage && (
          <div className="bg-rose-50 border-2 border-rose-300 text-rose-900 text-xs sm:text-sm p-4 rounded-2xl font-bold flex items-center gap-2.5 shadow-sm">
            <AlertTriangle className="w-5 h-5 text-rose-600 shrink-0" />
            <span>{errorMessage}</span>
          </div>
        )}

        {/* PAINEL DE EXIGÊNCIAS NECESSÁRIAS PARA AUTORIZAR O CADASTRO (CONFORME SOLICITADO PELO USUÁRIO) */}
        <div className="bg-slate-950 text-white rounded-3xl p-5 sm:p-6 border-2 border-[#ff6a00] shadow-xl space-y-4">
          <div className="flex items-center gap-3 border-b border-zinc-800 pb-3">
            <div className="w-10 h-10 rounded-xl bg-[#ff6a00]/20 border border-[#ff6a00]/50 text-[#ff6a00] flex items-center justify-center shrink-0">
              <ShieldCheck className="w-6 h-6" />
            </div>
            <div>
              <h3 className="font-heading font-black text-white text-base sm:text-lg">
                Exigências Obrigatórias para Autorizar o Cadastro
              </h3>
              <p className="text-xs text-zinc-400 font-medium">
                Critérios oficiais de homologação da categoria {selectedCategory.title} no município de Indaiatuba:
              </p>
            </div>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-3.5 text-xs">
            {/* Bloco 1: Condutor */}
            <div className="bg-zinc-900/90 border border-zinc-800 rounded-2xl p-3.5 space-y-2">
              <span className="font-heading font-black text-[#ff6a00] uppercase tracking-wider block text-[11px] flex items-center gap-1.5">
                <FileText className="w-3.5 h-3.5" />
                <span>Condutor</span>
              </span>
              <ul className="space-y-1.5 text-zinc-300 leading-relaxed">
                {selectedCategory.driverRequirements.map((req, idx) => (
                  <li key={idx} className="flex items-start gap-1.5">
                    <span className="text-[#ff6a00] font-bold shrink-0">&bull;</span>
                    <span>{req}</span>
                  </li>
                ))}
              </ul>
            </div>

            {/* Bloco 2: Veículo */}
            <div className="bg-zinc-900/90 border border-zinc-800 rounded-2xl p-3.5 space-y-2">
              <span className="font-heading font-black text-[#ff6a00] uppercase tracking-wider block text-[11px] flex items-center gap-1.5">
                <Car className="w-3.5 h-3.5" />
                <span>Veículo</span>
              </span>
              <ul className="space-y-1.5 text-zinc-300 leading-relaxed">
                {selectedCategory.vehicleRequirements.map((req, idx) => (
                  <li key={idx} className="flex items-start gap-1.5">
                    <span className="text-[#ff6a00] font-bold shrink-0">&bull;</span>
                    <span>{req}</span>
                  </li>
                ))}
              </ul>
            </div>

            {/* Bloco 3: Equipamentos e Segurança */}
            <div className="bg-zinc-900/90 border border-zinc-800 rounded-2xl p-3.5 space-y-2">
              <span className="font-heading font-black text-[#ff6a00] uppercase tracking-wider block text-[11px] flex items-center gap-1.5">
                <Shield className="w-3.5 h-3.5" />
                <span>Segurança</span>
              </span>
              <ul className="space-y-1.5 text-zinc-300 leading-relaxed">
                {selectedCategory.safetyRequirements.map((req, idx) => (
                  <li key={idx} className="flex items-start gap-1.5">
                    <span className="text-[#ff6a00] font-bold shrink-0">&bull;</span>
                    <span>{req}</span>
                  </li>
                ))}
              </ul>
            </div>
          </div>
        </div>

        {/* FORMULÁRIO DE CADASTRO COM DADOS OPERACIONAIS E CHECKLIST DE AUTORIZAÇÃO */}
        <form onSubmit={handleSubmitDetails} className="space-y-5 bg-white border border-slate-200 p-5 sm:p-7 rounded-3xl shadow-sm">
          {/* Dados do Condutor Vinculados */}
          <div className="p-3.5 bg-slate-50 border border-slate-200 rounded-2xl text-xs space-y-1 text-slate-700">
            <span className="font-bold text-slate-900 block">Profissional Titular da Conta:</span>
            <div className="flex flex-wrap gap-x-4 gap-y-1 text-slate-600">
              <span><strong>Nome:</strong> {currentUser.name}</span>
              <span><strong>E-mail:</strong> {currentUser.email}</span>
              <span><strong>Celular:</strong> {currentUser.phone}</span>
            </div>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            {/* Placa do Veículo */}
            <div className="space-y-1.5">
              <label className="text-xs font-bold text-slate-800 uppercase tracking-wider block">
                Placa do Veículo *
              </label>
              <input
                type="text"
                required
                value={plate}
                onChange={(e) => setPlate(e.target.value.toUpperCase())}
                placeholder="Ex: RCE9C40"
                maxLength={8}
                className="w-full bg-slate-50 border border-slate-300 rounded-xl px-4 py-3 text-sm sm:text-base font-mono font-bold text-slate-900 focus:outline-none focus:border-amber-500 uppercase"
              />
            </div>

            {/* Modelo do Veículo */}
            <div className="space-y-1.5">
              <label className="text-xs font-bold text-slate-800 uppercase tracking-wider block">
                {selectedCategory.modelLabel} *
              </label>
              <input
                type="text"
                required
                value={model}
                onChange={(e) => setModel(e.target.value)}
                placeholder={selectedCategory.modelPlaceholder}
                className="w-full bg-slate-50 border border-slate-300 rounded-xl px-4 py-3 text-sm sm:text-base font-medium text-slate-900 focus:outline-none focus:border-amber-500"
              />
            </div>

            {/* Ano de Fabricação */}
            <div className="space-y-1.5">
              <label className="text-xs font-bold text-slate-800 uppercase tracking-wider block">
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
                className="w-full bg-slate-50 border border-slate-300 rounded-xl px-4 py-3 text-sm sm:text-base font-medium text-slate-900 focus:outline-none focus:border-amber-500"
              />
              {selectedCategory.key === 'motorista_confort' && (
                <span className="text-[11px] font-bold text-[#ff6a00] block mt-0.5">
                  ★ Exigência Confort: Apenas veículos ano 2020 ou superior são autorizados.
                </span>
              )}
            </div>

            {/* CNH com EAR */}
            <div className="space-y-1.5">
              <label className="text-xs font-bold text-slate-800 uppercase tracking-wider block">
                Número do Registro da CNH *
              </label>
              <input
                type="text"
                required
                value={cnh}
                onChange={(e) => setCnh(e.target.value)}
                placeholder="Ex: 09283719280"
                className="w-full bg-slate-50 border border-slate-300 rounded-xl px-4 py-3 text-sm sm:text-base font-mono font-medium text-slate-900 focus:outline-none focus:border-amber-500"
              />
            </div>

            {/* Chave PIX Pessoal para Receber Corridas */}
            <div className="space-y-1.5 sm:col-span-2">
              <label className="text-xs font-bold text-slate-800 uppercase tracking-wider block">
                Sua Chave PIX (onde o passageiro transfere 100% da corrida) *
              </label>
              <input
                type="text"
                required
                value={pixKey}
                onChange={(e) => setPixKey(e.target.value)}
                placeholder="Ex: seu CPF, e-mail, celular ou chave aleatória"
                className="w-full bg-slate-50 border border-slate-300 rounded-xl px-4 py-3 text-sm sm:text-base font-mono font-medium text-slate-900 focus:outline-none focus:border-amber-500"
              />
            </div>

            {/* Campo Específico para Motoboy Entregas: Tipo de Baú */}
            {selectedCategory.hasTrunkType && (
              <div className="space-y-1.5 sm:col-span-2">
                <label className="text-xs font-bold text-slate-800 uppercase tracking-wider block">
                  Compartimento de Carga Homologado CONTRAN *
                </label>
                <select
                  value={trunkType}
                  onChange={(e) => setTrunkType(e.target.value)}
                  className="w-full bg-slate-50 border border-slate-300 rounded-xl px-4 py-3 text-sm sm:text-base font-medium text-slate-900 focus:outline-none focus:border-amber-500 cursor-pointer"
                >
                  <option value="Baú 80 Litros">Baú Rígido Fixado 80 Litros com Faixas Refletivas</option>
                  <option value="Baú 90 Litros">Baú Rígido Fixado 90 Litros com Faixas Refletivas</option>
                  <option value="Baú 120 Litros">Baú Rígido Fixado 120 Litros com Faixas Refletivas</option>
                  <option value="Mochila / Bag Térmica (até 20kg)">Mochila / Bag Térmica Impermeável (até 20kg)</option>
                </select>
              </div>
            )}
          </div>

          {/* CHECKLIST OBRIGATÓRIO DE CONFORMIDADE PARA AUTORIZAR O CADASTRO */}
          <div className="pt-4 border-t border-slate-200 space-y-3">
            <span className="text-xs font-heading font-black text-slate-950 uppercase tracking-wider block flex items-center gap-1.5">
              <CheckSquare className="w-4 h-4 text-emerald-600" />
              <span>Termos de Conformidade e Autorização Obrigatória (Marque todos para autorizar):</span>
            </span>

            {/* Checkbox 1: CNH e EAR */}
            <label className="flex items-start gap-3 p-3 bg-slate-50 border border-slate-300 hover:border-slate-400 rounded-2xl cursor-pointer transition-colors">
              <input
                type="checkbox"
                checked={checkCnhEar}
                onChange={(e) => setCheckCnhEar(e.target.checked)}
                className="mt-0.5 w-4 h-4 text-[#ff6a00] rounded border-slate-300 focus:ring-[#ff6a00] cursor-pointer"
              />
              <span className="text-xs text-slate-800 font-medium leading-relaxed">
                <strong>1. Habilitação & Antecedentes:</strong> Declaro sob as penas da lei que possuo CNH definitiva com anotação <strong>EAR (Exerce Atividade Remunerada)</strong> ativa e certidão de antecedentes criminais sem restrições impeditivas.
              </span>
            </label>

            {/* Checkbox 2: Veículo */}
            <label className="flex items-start gap-3 p-3 bg-slate-50 border border-slate-300 hover:border-slate-400 rounded-2xl cursor-pointer transition-colors">
              <input
                type="checkbox"
                checked={checkVehicleReq}
                onChange={(e) => setCheckVehicleReq(e.target.checked)}
                className="mt-0.5 w-4 h-4 text-[#ff6a00] rounded border-slate-300 focus:ring-[#ff6a00] cursor-pointer"
              />
              <span className="text-xs text-slate-800 font-medium leading-relaxed">
                <strong>2. Condição do Veículo & CRLV:</strong> Atesto que o veículo ({plate}) atende a todas as exigências técnicas da categoria {selectedCategory.title} (incluindo ar-condicionado, ano e estado mecânico) com CRLV devidamente licenciado e vigente.
              </span>
            </label>

            {/* Checkbox 3: Equipamentos de Segurança Específicos */}
            <label className="flex items-start gap-3 p-3 bg-slate-50 border border-slate-300 hover:border-slate-400 rounded-2xl cursor-pointer transition-colors">
              <input
                type="checkbox"
                checked={checkSafetyEquipment}
                onChange={(e) => setCheckSafetyEquipment(e.target.checked)}
                className="mt-0.5 w-4 h-4 text-[#ff6a00] rounded border-slate-300 focus:ring-[#ff6a00] cursor-pointer"
              />
              <span className="text-xs text-slate-800 font-medium leading-relaxed">
                <strong>3. Equipamentos de Segurança:</strong>
                {selectedCategory.role === 'motoboy' && selectedCategory.key === 'motoboy_passageiro' && (
                  <> Confirmo que possuo <strong>2 capacetes com selo INMETRO</strong> e viseira transparente sem riscos, e fornecerei <strong>toucas higiênicas descartáveis</strong> para todos os passageiros transportados.</>
                )}
                {selectedCategory.role === 'motoboy' && selectedCategory.key === 'motoboy_entregas' && (
                  <> Confirmo que possuo <strong>compartimento de carga homologado pelo CONTRAN</strong> (baú ou bag térmica) com faixas refletivas e capacete regulamentado com selo INMETRO.</>
                )}
                {selectedCategory.role === 'driver' && (
                  <> Confirmo que o veículo possui <strong>ar-condicionado em pleno funcionamento</strong>, 4 portas, cintos para todos e suporte veicular seguro para celular.</>
                )}
              </span>
            </label>

            {/* Checkbox 4: Taxa Semanal R$ 200 */}
            <label className="flex items-start gap-3 p-3 bg-slate-50 border border-slate-300 hover:border-slate-400 rounded-2xl cursor-pointer transition-colors">
              <input
                type="checkbox"
                checked={checkWeeklyFeeAwareness}
                onChange={(e) => setCheckWeeklyFeeAwareness(e.target.checked)}
                className="mt-0.5 w-4 h-4 text-[#ff6a00] rounded border-slate-300 focus:ring-[#ff6a00] cursor-pointer"
              />
              <span className="text-xs text-slate-800 font-medium leading-relaxed">
                <strong>4. Plano Semanal de R$ 200:</strong> Estou ciente de que, após o envio do cadastro, para liberar o recebimento de corridas é necessário pagar a assinatura de <strong>R$ 200/semana via PIX</strong> ({RACE_PIX_KEY}) com <strong>100% dos ganhos livres de comissões</strong>.
              </span>
            </label>
          </div>

          {/* Botão de Envio e Autorização */}
          <button
            type="submit"
            className="w-full py-4 px-6 rounded-2xl bg-[#ff6a00] hover:bg-[#e05e00] text-white font-heading font-black text-base sm:text-lg transition-all cursor-pointer shadow-lg shadow-[#ff6a00]/25 uppercase tracking-wider block mt-4 active:scale-[0.99]"
          >
            CONCLUIR E AUTORIZAR CADASTRO
          </button>
        </form>
      </div>
    );
  }

  // ESTÁGIO 3: TELA DE ASSINATURA R$ 200 VIA PIX CONFORME SOLICITADO NO ITEM 2 DO PROMPT:
  // "Depois do cadastro, mostrar: 'Agora pague R$200/semana PIX 9d9e5635-9e68-46bf-bffe-08bdae29c8ba para liberar'"
  return (
    <div className="space-y-6 max-w-xl mx-auto py-2 animate-fade-in">
      <div className="bg-emerald-50 border-2 border-emerald-400 rounded-3xl p-6 sm:p-7 text-center space-y-5 shadow-sm">
        <div className="w-16 h-16 bg-emerald-100 rounded-full flex items-center justify-center mx-auto text-emerald-700 shadow-inner">
          <CheckCircle2 className="w-10 h-10" />
        </div>

        <div className="space-y-2">
          <h2 className="text-xl sm:text-2xl font-heading font-black text-slate-950">
            Cadastro de Motorista Autorizado com Sucesso!
          </h2>
          <p className="text-xs text-slate-600 font-medium">
            Categoria Homologada: <strong>{selectedCategory.title}</strong> &bull; Veículo: {createdDriver?.vehicleModel} ({createdDriver?.vehiclePlate})
          </p>

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
            <span className="text-emerald-700 font-mono font-bold">R$ 200,00</span>
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
            className="w-full py-4 px-6 rounded-2xl bg-emerald-600 hover:bg-emerald-500 text-white font-heading font-black text-base transition-all cursor-pointer shadow-lg shadow-emerald-600/20 uppercase tracking-wider block active:scale-98"
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
