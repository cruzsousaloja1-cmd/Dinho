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
  Clock,
  Lock,
  Loader2
} from 'lucide-react';
import confetti from 'canvas-confetti';
import { RACE_PIX_KEY, RACE_PIX_BANK, RACE_PIX_NAME, WEEKLY_FEE } from '../config/pricing';
import { saveUserAccount } from '../services/userService';
import { updateMotoristaSupabase, saveUsuarioSupabase } from '../supabase';

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
    badge: 'R$ 2,50/km • 85% para Você',
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
      'Você fica com 85% de cada corrida (Race 15%) - Sem mensalidade'
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
      'Chave PIX cadastrada para recebimento dos seus ganhos (85%)'
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
      'Chave PIX própria para recebimento de 85% da corrida direto para você'
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
      'Chave PIX para recebimento de 85% dos ganhos de cada corrida'
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
      'Você fica com 85% e Race com 15% - Sem mensalidade'
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
      'Chave PIX pessoal para recebimento de 85% do frete'
    ],
  },
};

interface DriverWorkSelectionViewProps {
  currentUser: AppUser;
  onCompleteDriverRegister: (driver: Driver) => void;
  onBackToRides?: () => void;
  onRenewWeeklyPlan?: (driver?: Driver) => void;
  isMandatorySetup?: boolean;
  hideLockedOnlineButton?: boolean;
}

export const DriverWorkSelectionView: React.FC<DriverWorkSelectionViewProps> = ({
  currentUser,
  onCompleteDriverRegister,
  onBackToRides,
  isMandatorySetup = false,
  hideLockedOnlineButton = false,
}) => {
  const [stage, setStage] = useState<'select_category' | 'fill_details'>('select_category');
  const [selectedKey, setSelectedKey] = useState<WorkCategoryKey>('motorista_economico');

  // Estado para expandir detalhes de exigências nos cards
  const [expandedCardKey, setExpandedCardKey] = useState<WorkCategoryKey | null>(null);

  // Form de detalhes operacionais do motorista / motoboy
  const [plate, setPlate] = useState(currentUser.driverData?.vehiclePlate || '');
  const [model, setModel] = useState(currentUser.driverData?.vehicleModel || '');
  const [year, setYear] = useState(
    currentUser.driverData?.vehicleYear ? String(currentUser.driverData.vehicleYear) : ''
  );
  const [cnh, setCnh] = useState(currentUser.driverData?.cnh || '');
  const [cpf, setCpf] = useState(currentUser.driverData?.cpf || '');
  const [pixKey, setPixKey] = useState(currentUser.driverData?.pixKey || '');
  const [trunkType, setTrunkType] = useState(
    currentUser.driverData?.trunkType || 'Baú 80 Litros'
  );
  const [color, setColor] = useState(currentUser.driverData?.vehicleColor || '');
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const [isSaving, setIsSaving] = useState(false);

  // Checklist de conformidade (pré-marcado opcional ou fácil confirmação)
  const [checkCompliance, setCheckCompliance] = useState(true);

  const selectedCategory = WORK_CATEGORIES[selectedKey];

  const handleSelectCategory = (key: WorkCategoryKey) => {
    setSelectedKey(key);
    const cat = WORK_CATEGORIES[key];
    setModel('');
    setYear(cat.defaultYear);
    if (key === 'motoboy_passageiro') {
      setTrunkType('Sem baú (Transporte de Passageiro)');
    } else if (key === 'motoboy_entregas') {
      setTrunkType('Baú 80 Litros');
    }
    setErrorMessage(null);
    setCheckCompliance(true);
    setStage('fill_details');
  };

  const handleSubmitDetails = async (e: React.FormEvent) => {
    e.preventDefault();
    setErrorMessage(null);

    const isCarCategory = selectedCategory.role === 'driver';
    const cleanPlate = plate.trim().toUpperCase();
    const cleanModel = model.trim();
    const cleanCnh = cnh.trim();
    const cleanColor = color.trim();
    const cleanCpf = cpf.trim();
    const cleanBau = isCarCategory ? '' : trunkType.trim();
    const yearNum = parseInt(year, 10) || 2022;

    if (isCarCategory) {
      if (!cleanPlate || !cleanModel || !year.trim() || !cleanColor || !cleanCnh || !cleanCpf) {
        setErrorMessage('Preencha todos os campos obrigatórios: Placa, Modelo, Ano, Cor, CNH e CPF.');
        return;
      }
      if (selectedCategory.key === 'motorista_confort' && yearNum < 2020) {
        setErrorMessage('A categoria Motorista Confort exige veículo ano 2020 ou superior.');
        return;
      }
    } else {
      if (!cleanPlate || !cleanModel || !year.trim() || !cleanCnh || !cleanBau) {
        setErrorMessage('Preencha todos os campos obrigatórios: Placa moto, Modelo moto, Ano, CNH A e Baú.');
        return;
      }
    }

    if (!checkCompliance) {
      setErrorMessage('Confirme a declaração de conformidade abaixo para liberar seu botão ONLINE.');
      return;
    }

    setIsSaving(true);
    try {
      const existingDriver = currentUser.driverData;
      const newDriver: Driver = {
        ...(existingDriver || {}),
        id: existingDriver?.id || currentUser.id || '',
        name: currentUser.name,
        avatar: currentUser.avatar || existingDriver?.avatar || '',
        phone: currentUser.phone,
        email: currentUser.email,
        password: currentUser.password || '',
        cpf: cleanCpf,
        cnh: cleanCnh,
        category: selectedCategory.vehicleCategory,
        categoryConfigured: true,
        vehicleModel: cleanModel,
        vehiclePlate: cleanPlate,
        vehicleColor: cleanColor,
        vehicleYear: yearNum,
        rating: existingDriver?.rating || currentUser.rating || 0,
        totalRides: existingDriver?.totalRides || 0,
        status: 'offline', // Categoria escolhida -> libera o botão ONLINE verde no painel do motorista
        lat: existingDriver?.lat || -23.0903,
        lng: existingDriver?.lng || -47.2180,
        weeklyPlanActive: true,
        weeklyFeePaidAt: existingDriver?.weeklyFeePaidAt || new Date().toISOString(),
        weeklyFeeExpiresAt: null,
        weeklyPlanExpiresAt: null,
        weeklyPlanPrice: 0,
        pixKey: pixKey.trim() || cleanCpf || currentUser.phone,
        trunkType: isCarCategory ? undefined : cleanBau,
        earningsToday: existingDriver?.earningsToday || 0,
        earningsWeek: existingDriver?.earningsWeek || 0,
        walletBalance: existingDriver?.walletBalance || 0,
        cnhVerified: true,
        vehicleVerified: true,
        criminalRecordClear: true,
        registrationDate: existingDriver?.registrationDate || new Date().toISOString().split('T')[0],
        comfortEligible: selectedCategory.key === 'motorista_confort',
        comfortEligibilityReason: selectedCategory.key === 'motorista_confort' ? 'Aprovado para Confort (2020+)' : undefined,
      };

      const updatedAccount = {
        id: currentUser.id,
        name: currentUser.name,
        email: currentUser.email,
        phone: currentUser.phone,
        whatsapp: currentUser.whatsapp || currentUser.phone,
        login: currentUser.login || currentUser.email,
        password: currentUser.password,
        role: selectedCategory.role,
        tipo: selectedCategory.userTipo,
        placa: cleanPlate,
        avatar: newDriver.avatar,
        rating: newDriver.rating,
        driverData: newDriver,
        createdAt: new Date().toISOString(),
      };

      saveUserAccount(updatedAccount, true);

      // Salva categoria exata no Supabase na tabela public.usuarios (ex: categoria = 'Motorista Confort')
      const updRes = await updateMotoristaSupabase(currentUser.email, {
        categoria: selectedCategory.title,
        placa: cleanPlate,
        modelo: cleanModel,
        ano: yearNum,
        cor: cleanColor,
        cnh: cleanCnh,
        cpf: cleanCpf,
        bau: cleanBau,
        tipo: selectedCategory.userTipo,
        status: 'offline',
        plano_ativo: true,
      }).catch(() => ({ success: false, data: null }));

      if (!updRes.success || !updRes.data) {
        await saveUsuarioSupabase({
          nome: currentUser.name,
          email: currentUser.email,
          celular: currentUser.phone,
          whatsapp: currentUser.whatsapp || currentUser.phone,
          login: currentUser.login || currentUser.email,
          senha: currentUser.password || '123456',
          tipo: selectedCategory.userTipo,
          categoria: selectedCategory.title,
          placa: cleanPlate,
          modelo: cleanModel,
          ano: yearNum,
          cor: cleanColor,
          cnh: cleanCnh,
          cpf: cleanCpf,
          bau: cleanBau,
          foto: newDriver.avatar,
          avatar: newDriver.avatar,
          plano_ativo: true,
          status: 'offline',
        }).catch(() => {});
      }

      try {
        confetti({ particleCount: 70, spread: 80, origin: { y: 0.6 } });
      } catch {}

      onCompleteDriverRegister(newDriver);
    } finally {
      setIsSaving(false);
    }
  };

  // ESTÁGIO 1: ESCOLHA OBRIGATÓRIA DE CATEGORIA DENTRO DO APP ANTES DE FICAR ONLINE
  if (stage === 'select_category') {
    return (
      <div className="space-y-5 max-w-2xl mx-auto py-2 animate-fade-in">
        {/* Topo com navegação (se não for bloqueio obrigatório, permite voltar) */}
        <div className="flex flex-wrap items-center justify-between gap-2 border-b border-slate-200 pb-3">
          {!isMandatorySetup && onBackToRides ? (
            <button
              type="button"
              onClick={onBackToRides}
              className="text-slate-600 hover:text-slate-900 text-xs font-bold transition-all cursor-pointer flex items-center gap-1.5"
            >
              <ArrowLeft className="w-4 h-4" />
              <span>Voltar</span>
            </button>
          ) : (
            <span className="text-xs font-mono font-black text-amber-700 bg-amber-50 px-3 py-1 rounded-full border border-amber-300">
              PASSO OBRIGATÓRIO ANTES DE FICAR ONLINE
            </span>
          )}
          <span className="text-xs font-mono font-bold text-emerald-700 bg-emerald-50 px-2.5 py-1 rounded-full border border-emerald-200">
            85% para Você • 15% Race • Sem mensalidade
          </span>
        </div>

        {/* Título obrigatório solicitado */}
        <div className="text-center space-y-2 bg-zinc-950 text-white rounded-3xl p-5 sm:p-6 border-2 border-[#ff6a00] shadow-xl">
          <h2 className="text-xl sm:text-2xl font-heading font-black text-white tracking-tight">
            Escolha como quer trabalhar para receber corridas
          </h2>
          <p className="text-xs sm:text-sm text-zinc-300 font-medium max-w-lg mx-auto">
            Selecione uma das 4 categorias abaixo e informe os dados do seu veículo para liberar o botão verde ONLINE e começar a receber chamados da sua categoria.
          </p>

          {!hideLockedOnlineButton && (
            <div className="pt-2">
              <button
                type="button"
                disabled
                className="w-full py-3.5 px-5 rounded-2xl bg-slate-600 text-slate-200 font-heading font-black text-xs sm:text-sm flex items-center justify-center gap-2 cursor-not-allowed border border-slate-500 opacity-90"
              >
                <Lock className="w-4 h-4 shrink-0" />
                <span>Escolha sua categoria para ficar ONLINE</span>
              </button>
            </div>
          )}
        </div>

        {/* 4 Botões Obrigatórios de Categoria */}
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
          {(Object.keys(WORK_CATEGORIES) as WorkCategoryKey[]).map((catKey) => {
            const cat = WORK_CATEGORIES[catKey];
            return (
              <button
                key={cat.key}
                type="button"
                onClick={() => handleSelectCategory(catKey)}
                className={`p-4 rounded-2xl border-2 text-left transition-all cursor-pointer flex items-center justify-between gap-3 shadow-sm hover:shadow-md active:scale-[0.99] ${
                  catKey === 'motorista_confort'
                    ? 'border-[#ff6a00]/60 hover:border-[#ff6a00] bg-[#fffaf5]'
                    : catKey === 'motoboy_passageiro'
                    ? 'border-cyan-400 hover:border-cyan-600 bg-[#f7fdff]'
                    : catKey === 'motoboy_entregas'
                    ? 'border-amber-400 hover:border-amber-600 bg-[#fffdf7]'
                    : 'border-slate-300 hover:border-slate-900 bg-white'
                }`}
              >
                <div className="flex items-center gap-3">
                  <div className="w-12 h-12 rounded-2xl bg-white border border-slate-200 flex items-center justify-center shrink-0 shadow-xs">
                    {cat.icon}
                  </div>
                  <div>
                    <span className="font-heading font-black text-slate-950 text-base block">
                      {cat.title}
                    </span>
                    <span className="text-[11px] font-bold text-slate-600 block">
                      {cat.pricePerKm} • {cat.role === 'driver' ? 'Carro' : 'Moto'}
                    </span>
                  </div>
                </div>
                <ArrowRight className="w-5 h-5 text-slate-700 shrink-0" />
              </button>
            );
          })}
        </div>

        {/* Lista detalhada com Exigências de cada categoria */}
        <div className="grid grid-cols-1 gap-3">
          {(Object.keys(WORK_CATEGORIES) as WorkCategoryKey[]).map((catKey) => {
            const cat = WORK_CATEGORIES[catKey];
            const isExpanded = expandedCardKey === catKey;

            return (
              <div
                key={`info-${cat.key}`}
                className="bg-white border border-slate-200 rounded-2xl p-4 shadow-2xs"
              >
                <div className="flex items-center justify-between gap-2">
                  <div>
                    <h3 className="font-heading font-black text-slate-900 text-sm">
                      {cat.title} — {cat.subtitle}
                    </h3>
                  </div>
                  <button
                    type="button"
                    onClick={() => handleSelectCategory(catKey)}
                    className="px-3.5 py-2 rounded-xl bg-slate-950 hover:bg-[#ff6a00] text-white font-heading font-black text-xs transition-all cursor-pointer shrink-0"
                  >
                    Escolher
                  </button>
                </div>

                {/* Destaques das Exigências Obrigatórias */}
                <div className="mt-3 pt-2 border-t border-slate-100">
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-1.5 text-xs">
                    {cat.keyHighlights.map((highlight, idx) => (
                      <div key={idx} className="flex items-center gap-1.5 text-slate-600 font-medium">
                        <Check className="w-3.5 h-3.5 text-emerald-600 shrink-0" />
                        <span>{highlight}</span>
                      </div>
                    ))}
                  </div>
                </div>

                <div className="mt-2.5">
                  <button
                    type="button"
                    onClick={() => setExpandedCardKey(isExpanded ? null : catKey)}
                    className="text-xs font-bold text-amber-700 hover:text-amber-800 flex items-center gap-1 cursor-pointer transition-colors"
                  >
                    <Info className="w-3.5 h-3.5" />
                    <span>{isExpanded ? 'Ocultar exigências detalhadas' : 'Ver exigências detalhadas'}</span>
                    {isExpanded ? <ChevronUp className="w-3.5 h-3.5" /> : <ChevronDown className="w-3.5 h-3.5" />}
                  </button>

                  {isExpanded && (
                    <div className="mt-2.5 p-3.5 bg-slate-50 rounded-2xl border border-slate-200 space-y-2.5 text-xs animate-fade-in">
                      <div>
                        <span className="font-bold text-slate-900 block mb-1">1. Requisitos do Condutor:</span>
                        <ul className="list-disc list-inside space-y-0.5 text-slate-600 pl-1">
                          {cat.driverRequirements.map((req, rIdx) => (
                            <li key={rIdx}>{req}</li>
                          ))}
                        </ul>
                      </div>
                      <div>
                        <span className="font-bold text-slate-900 block mb-1">2. Requisitos do Veículo:</span>
                        <ul className="list-disc list-inside space-y-0.5 text-slate-600 pl-1">
                          {cat.vehicleRequirements.map((req, rIdx) => (
                            <li key={rIdx}>{req}</li>
                          ))}
                        </ul>
                      </div>
                    </div>
                  )}
                </div>
              </div>
            );
          })}
        </div>
      </div>
    );
  }

  // ESTÁGIO 2: FORMULÁRIO ESPECÍFICO DA CATEGORIA ESCOLHIDA
  if (stage === 'fill_details') {
    const isCarCategory = selectedCategory.role === 'driver';
    return (
      <div className="space-y-5 max-w-2xl mx-auto py-2 animate-fade-in">
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
          <span className="text-xs font-mono font-black text-slate-900 bg-amber-100 border border-amber-300 px-3 py-1 rounded-full">
            {selectedCategory.title}
          </span>
        </div>

        {/* Título Principal */}
        <div className="space-y-1">
          <h2 className="text-xl sm:text-2xl font-heading font-black text-slate-950 tracking-tight">
            Dados para {selectedCategory.title}
          </h2>
          <p className="text-xs sm:text-sm text-slate-600 font-medium">
            Preencha os dados abaixo para salvar sua categoria e liberar o botão verde <strong>ONLINE</strong>.
          </p>
        </div>

        {/* Mensagem de Erro */}
        {errorMessage && (
          <div className="bg-rose-50 border-2 border-rose-300 text-rose-900 text-xs sm:text-sm p-4 rounded-2xl font-bold flex items-center gap-2.5 shadow-sm">
            <AlertTriangle className="w-5 h-5 text-rose-600 shrink-0" />
            <span>{errorMessage}</span>
          </div>
        )}

        <form onSubmit={handleSubmitDetails} className="space-y-4 bg-white border border-slate-200 p-5 sm:p-6 rounded-3xl shadow-sm">
          <div className="p-3 bg-slate-50 border border-slate-200 rounded-2xl text-xs text-slate-700 flex flex-wrap gap-x-4 gap-y-1">
            <span><strong>Condutor:</strong> {currentUser.name}</span>
            <span><strong>E-mail:</strong> {currentUser.email}</span>
            <span><strong>Categoria:</strong> {selectedCategory.title}</span>
          </div>

          {isCarCategory ? (
            /* FORMULÁRIO MOTORISTA ECONÔMICO / CONFORT: Placa, Modelo, Ano, Cor, CNH, CPF */
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div className="space-y-1.5">
                <label className="text-xs font-bold text-slate-800 uppercase tracking-wider block">
                  Placa *
                </label>
                <input
                  type="text"
                  required
                  value={plate}
                  onChange={(e) => setPlate(e.target.value.toUpperCase())}
                  placeholder="Ex: ABC1D23"
                  maxLength={8}
                  className="w-full bg-slate-50 border border-slate-300 rounded-xl px-4 py-3 text-sm font-mono font-bold text-slate-900 focus:outline-none focus:border-amber-500 uppercase"
                />
              </div>

              <div className="space-y-1.5">
                <label className="text-xs font-bold text-slate-800 uppercase tracking-wider block">
                  Modelo *
                </label>
                <input
                  type="text"
                  required
                  value={model}
                  onChange={(e) => setModel(e.target.value)}
                  placeholder={selectedCategory.modelPlaceholder}
                  className="w-full bg-slate-50 border border-slate-300 rounded-xl px-4 py-3 text-sm font-medium text-slate-900 focus:outline-none focus:border-amber-500"
                />
              </div>

              <div className="space-y-1.5">
                <label className="text-xs font-bold text-slate-800 uppercase tracking-wider block">
                  Ano *
                </label>
                <input
                  type="number"
                  required
                  min={selectedCategory.minYear || 2005}
                  max={2026}
                  value={year}
                  onChange={(e) => setYear(e.target.value)}
                  placeholder={selectedCategory.key === 'motorista_confort' ? 'Ex: 2022' : 'Ex: 2019'}
                  className="w-full bg-slate-50 border border-slate-300 rounded-xl px-4 py-3 text-sm font-medium text-slate-900 focus:outline-none focus:border-amber-500"
                />
                {selectedCategory.key === 'motorista_confort' && (
                  <span className="text-[11px] font-bold text-[#ff6a00] block">
                    Exigência Confort: ano 2020 ou superior.
                  </span>
                )}
              </div>

              <div className="space-y-1.5">
                <label className="text-xs font-bold text-slate-800 uppercase tracking-wider block">
                  Cor *
                </label>
                <input
                  type="text"
                  required
                  value={color}
                  onChange={(e) => setColor(e.target.value)}
                  placeholder="Ex: Prata, Preto, Branco"
                  className="w-full bg-slate-50 border border-slate-300 rounded-xl px-4 py-3 text-sm font-medium text-slate-900 focus:outline-none focus:border-amber-500"
                />
              </div>

              <div className="space-y-1.5">
                <label className="text-xs font-bold text-slate-800 uppercase tracking-wider block">
                  CNH *
                </label>
                <input
                  type="text"
                  required
                  value={cnh}
                  onChange={(e) => setCnh(e.target.value)}
                  placeholder="Número da CNH (com EAR)"
                  className="w-full bg-slate-50 border border-slate-300 rounded-xl px-4 py-3 text-sm font-mono font-medium text-slate-900 focus:outline-none focus:border-amber-500"
                />
              </div>

              <div className="space-y-1.5">
                <label className="text-xs font-bold text-slate-800 uppercase tracking-wider block">
                  CPF *
                </label>
                <input
                  type="text"
                  required
                  value={cpf}
                  onChange={(e) => setCpf(e.target.value)}
                  placeholder="000.000.000-00"
                  className="w-full bg-slate-50 border border-slate-300 rounded-xl px-4 py-3 text-sm font-mono font-medium text-slate-900 focus:outline-none focus:border-amber-500"
                />
              </div>
            </div>
          ) : (
            /* FORMULÁRIO MOTOBOY PASSAGEIRO / ENTREGAS: Placa moto, Modelo moto, Ano, CNH A, Baú */
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div className="space-y-1.5">
                <label className="text-xs font-bold text-slate-800 uppercase tracking-wider block">
                  Placa moto *
                </label>
                <input
                  type="text"
                  required
                  value={plate}
                  onChange={(e) => setPlate(e.target.value.toUpperCase())}
                  placeholder="Ex: RCE9M22"
                  maxLength={8}
                  className="w-full bg-slate-50 border border-slate-300 rounded-xl px-4 py-3 text-sm font-mono font-bold text-slate-900 focus:outline-none focus:border-amber-500 uppercase"
                />
              </div>

              <div className="space-y-1.5">
                <label className="text-xs font-bold text-slate-800 uppercase tracking-wider block">
                  Modelo moto *
                </label>
                <input
                  type="text"
                  required
                  value={model}
                  onChange={(e) => setModel(e.target.value)}
                  placeholder={selectedCategory.modelPlaceholder}
                  className="w-full bg-slate-50 border border-slate-300 rounded-xl px-4 py-3 text-sm font-medium text-slate-900 focus:outline-none focus:border-amber-500"
                />
              </div>

              <div className="space-y-1.5">
                <label className="text-xs font-bold text-slate-800 uppercase tracking-wider block">
                  Ano *
                </label>
                <input
                  type="number"
                  required
                  min={2005}
                  max={2026}
                  value={year}
                  onChange={(e) => setYear(e.target.value)}
                  placeholder="Ex: 2022"
                  className="w-full bg-slate-50 border border-slate-300 rounded-xl px-4 py-3 text-sm font-medium text-slate-900 focus:outline-none focus:border-amber-500"
                />
              </div>

              <div className="space-y-1.5">
                <label className="text-xs font-bold text-slate-800 uppercase tracking-wider block">
                  CNH A *
                </label>
                <input
                  type="text"
                  required
                  value={cnh}
                  onChange={(e) => setCnh(e.target.value)}
                  placeholder="Número da CNH A (com EAR)"
                  className="w-full bg-slate-50 border border-slate-300 rounded-xl px-4 py-3 text-sm font-mono font-medium text-slate-900 focus:outline-none focus:border-amber-500"
                />
              </div>

              <div className="space-y-1.5 sm:col-span-2">
                <label className="text-xs font-bold text-slate-800 uppercase tracking-wider block">
                  Baú *
                </label>
                <select
                  value={trunkType}
                  onChange={(e) => setTrunkType(e.target.value)}
                  className="w-full bg-slate-50 border border-slate-300 rounded-xl px-4 py-3 text-sm font-medium text-slate-900 focus:outline-none focus:border-amber-500 cursor-pointer"
                >
                  {selectedCategory.key === 'motoboy_passageiro' && (
                    <option value="Sem baú (Transporte de Passageiro)">Sem baú (Transporte de Passageiro com 2 capacetes)</option>
                  )}
                  <option value="Baú 80 Litros">Baú 80 Litros</option>
                  <option value="Baú 90 Litros">Baú 90 Litros</option>
                  <option value="Baú 120 Litros">Baú 120 Litros</option>
                  <option value="Mochila / Bag Térmica (até 20kg)">Mochila / Bag Térmica (até 20kg)</option>
                </select>
              </div>
            </div>
          )}

          {/* Chave PIX Opcional para Saques */}
          <div className="space-y-1.5">
            <label className="text-xs font-bold text-slate-800 uppercase tracking-wider block">
              Chave PIX (para receber seus 85% das corridas)
            </label>
            <input
              type="text"
              value={pixKey}
              onChange={(e) => setPixKey(e.target.value)}
              placeholder="Opcional: CPF, e-mail, celular ou chave aleatória"
              className="w-full bg-slate-50 border border-slate-300 rounded-xl px-4 py-3 text-sm font-mono font-medium text-slate-900 focus:outline-none focus:border-amber-500"
            />
          </div>

          {/* Confirmação de Conformidade */}
          <label className="flex items-start gap-3 p-3.5 bg-emerald-50 border border-emerald-300 rounded-2xl cursor-pointer transition-colors">
            <input
              type="checkbox"
              checked={checkCompliance}
              onChange={(e) => setCheckCompliance(e.target.checked)}
              className="mt-0.5 w-4 h-4 text-emerald-600 rounded border-slate-300 focus:ring-emerald-500 cursor-pointer"
            />
            <span className="text-xs text-slate-800 font-medium leading-relaxed">
              Confirmo que possuo CNH válida com EAR e que meu veículo atende aos requisitos da categoria <strong>{selectedCategory.title}</strong>. Modelo RACE: <strong>85% para você e 15% Race, sem mensalidade</strong>.
            </span>
          </label>

          <button
            type="submit"
            disabled={isSaving}
            className="w-full py-4 px-6 rounded-2xl bg-emerald-600 hover:bg-emerald-500 disabled:opacity-60 text-white font-heading font-black text-base transition-all cursor-pointer shadow-lg uppercase tracking-wider flex items-center justify-center gap-2 active:scale-[0.99]"
          >
            {isSaving ? (
              <>
                <Loader2 className="w-5 h-5 animate-spin" />
                <span>SALVANDO CATEGORIA NO SUPABASE...</span>
              </>
            ) : (
              <>
                <CheckCircle2 className="w-5 h-5" />
                <span>SALVAR CATEGORIA E LIBERAR BOTÃO ONLINE</span>
              </>
            )}
          </button>
        </form>
      </div>
    );
  }

  return null;
};
