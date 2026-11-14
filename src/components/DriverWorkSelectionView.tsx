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
  Loader2,
  Camera,
  LogOut
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
    subtitle: 'Carro popular, corridas mais baratas',
    tagline: 'Ideal para hatch, sedã e carros populares',
    badge: 'R$ 2,50/km • 85% para Você',
    pricePerKm: 'R$ 2,50/km',
    icon: <Car className="w-8 h-8 text-slate-700" />,
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
    subtitle: 'Carro 2020+, mais conforto',
    tagline: 'Veículos sedã, SUV e premium ano 2020 ou superior',
    badge: 'R$ 3,50/km • Carro 2020+',
    pricePerKm: 'R$ 3,50/km',
    icon: (
      <div className="relative flex items-center justify-center">
        <Car className="w-8 h-8 text-[#ff6a00]" />
        <Sparkles className="w-4 h-4 text-amber-500 absolute -top-1.5 -right-2" />
      </div>
    ),
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
    subtitle: 'Levar passageiro de moto',
    tagline: 'Agilidade no trânsito para corridas individuais rápidas',
    badge: 'R$ 1,80/km • Moto Táxi',
    pricePerKm: 'R$ 1,80/km',
    icon: <Bike className="w-8 h-8 text-cyan-500" />,
    vehicleCategory: 'moto_passageiro',
    role: 'motoboy',
    userTipo: 'motoboy_passageiro',
    modelLabel: 'MODELO DA MOTO',
    modelPlaceholder: 'Ex: Honda CG 160 Titan, Yamaha Fazer 250, Honda Bros, Factor 150',
    hasYear: true,
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
    subtitle: 'Fazer entregas',
    tagline: 'Delivery de pacotes, compras, documentos e itens do comércio',
    badge: 'R$ 2,00/km • Entregas & Flash',
    pricePerKm: 'R$ 2,00/km',
    icon: <Package className="w-8 h-8 text-amber-500" />,
    vehicleCategory: 'moto_entrega',
    role: 'motoboy',
    userTipo: 'motoboy_entregas',
    modelLabel: 'MODELO DA MOTO',
    modelPlaceholder: 'Ex: Honda CG 160 Start, Yamaha Factor 150, Honda Bros',
    hasYear: true,
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
  onLogout?: () => void;
  isMandatorySetup?: boolean;
  hideLockedOnlineButton?: boolean;
}

function compressUploadImage(file: File, callback: (dataUrl: string) => void) {
  const reader = new FileReader();
  reader.onload = (ev) => {
    const raw = ev.target?.result as string;
    if (!raw) return;
    const img = new Image();
    img.onload = () => {
      const maxDim = 720;
      let { width, height } = img;
      if (width > maxDim || height > maxDim) {
        if (width > height) {
          height = Math.round((height * maxDim) / width);
          width = maxDim;
        } else {
          width = Math.round((width * maxDim) / height);
          height = maxDim;
        }
      }
      const canvas = document.createElement('canvas');
      canvas.width = width;
      canvas.height = height;
      const ctx = canvas.getContext('2d');
      if (ctx) {
        ctx.drawImage(img, 0, 0, width, height);
        callback(canvas.toDataURL('image/jpeg', 0.72));
      } else {
        callback(raw);
      }
    };
    img.onerror = () => callback(raw);
    img.src = raw;
  };
  reader.readAsDataURL(file);
}

export const DriverWorkSelectionView: React.FC<DriverWorkSelectionViewProps> = ({
  currentUser,
  onCompleteDriverRegister,
  onBackToRides,
  onLogout,
  isMandatorySetup = false,
  hideLockedOnlineButton = false,
}) => {
  const [stage, setStage] = useState<'select_category' | 'fill_details'>('select_category');
  const [selectedKey, setSelectedKey] = useState<WorkCategoryKey>('motorista_economico');

  // Form de detalhes operacionais do motorista / motoboy
  const [plate, setPlate] = useState(currentUser.driverData?.vehiclePlate || '');
  const [model, setModel] = useState(currentUser.driverData?.vehicleModel || '');
  const [year, setYear] = useState(
    currentUser.driverData?.vehicleYear ? String(currentUser.driverData.vehicleYear) : ''
  );
  const [cnh, setCnh] = useState(currentUser.driverData?.cnh || '');
  const [cpf, setCpf] = useState(currentUser.driverData?.cpf || '');
  const [pixKey, setPixKey] = useState(currentUser.driverData?.pixKey || '');
  const [hasTrunk, setHasTrunk] = useState<'Sim' | 'Não'>(
    currentUser.driverData?.hasTrunk ? 'Sim' : 'Não'
  );
  const [trunkType, setTrunkType] = useState(
    currentUser.driverData?.trunkType || 'Baú 80 Litros'
  );
  const [color, setColor] = useState(currentUser.driverData?.vehicleColor || '');
  const [vehiclePhoto, setVehiclePhoto] = useState(currentUser.driverData?.vehiclePhoto || '');
  const [cnhPhoto, setCnhPhoto] = useState(currentUser.driverData?.cnhPhoto || '');
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const [isSaving, setIsSaving] = useState(false);

  const selectedCategory = WORK_CATEGORIES[selectedKey];

  const handleSelectCategory = (key: WorkCategoryKey) => {
    setSelectedKey(key);
    const cat = WORK_CATEGORIES[key];
    setModel('');
    setYear(cat.defaultYear);
    if (key === 'motoboy_entregas') {
      setHasTrunk('Sim');
      setTrunkType('Baú 80 Litros');
    } else if (key === 'motoboy_passageiro') {
      setHasTrunk('Não');
      setTrunkType('Não');
    }
    setErrorMessage(null);
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
    const cleanBau = isCarCategory
      ? ''
      : hasTrunk === 'Sim'
      ? `Sim (${trunkType})`
      : 'Não';
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
      if (!cleanPlate || !cleanModel || !year.trim() || !cleanColor || !cleanCnh || !cleanCpf) {
        setErrorMessage('Preencha todos os campos obrigatórios: Placa moto, Modelo moto, Ano, Cor, CNH A e CPF.');
        return;
      }
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
        vehiclePhoto: vehiclePhoto || undefined,
        cnhPhoto: cnhPhoto || undefined,
        hasTrunk: !isCarCategory && hasTrunk === 'Sim',
        rating: existingDriver?.rating || currentUser.rating || 0,
        totalRides: existingDriver?.totalRides || 0,
        status: 'online', // "Salvar e ficar ONLINE" -> libera app já ONLINE
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

      // Salva no Supabase na tabela usuarios: categoria = 'Motorista Confort' (ou a que escolheu), online = true, status = 'online'
      const updRes = await updateMotoristaSupabase(currentUser.email, {
        categoria: selectedCategory.title,
        placa: cleanPlate,
        modelo: cleanModel,
        ano: yearNum,
        cor: cleanColor,
        cnh: cleanCnh,
        cpf: cleanCpf,
        bau: cleanBau,
        foto_veiculo: vehiclePhoto,
        foto_cnh: cnhPhoto,
        tipo: selectedCategory.userTipo,
        status: 'online',
        online: true,
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
          foto_veiculo: vehiclePhoto,
          foto_cnh: cnhPhoto,
          plano_ativo: true,
          online: true,
          status: 'online',
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

  // ESTÁGIO 1: TELA OBRIGATÓRIA DE ESCOLHA DE MODALIDADE
  if (stage === 'select_category') {
    return (
      <div className="space-y-6 max-w-2xl mx-auto py-2 animate-fade-in">
        {/* Topo com identificação RACE e Sair opcional */}
        <div className="flex items-center justify-between gap-2 pb-2 border-b border-zinc-800/40">
          <div className="flex items-center gap-2">
            <span className="text-2xl font-heading font-black text-[#ff6a00] tracking-tighter uppercase">
              RACE
            </span>
            <span className="text-xs font-mono font-bold text-amber-400 bg-amber-500/15 px-3 py-1 rounded-full border border-amber-500/40">
              Complete seu cadastro para começar a trabalhar
            </span>
          </div>
          {!isMandatorySetup && onBackToRides ? (
            <button
              type="button"
              onClick={onBackToRides}
              className="text-slate-600 hover:text-slate-900 text-xs font-bold transition-all cursor-pointer flex items-center gap-1"
            >
              <ArrowLeft className="w-4 h-4" />
              <span>Voltar</span>
            </button>
          ) : onLogout ? (
            <button
              type="button"
              onClick={onLogout}
              className="text-xs font-bold text-zinc-400 hover:text-white flex items-center gap-1 cursor-pointer"
            >
              <LogOut className="w-3.5 h-3.5" />
              <span>Sair</span>
            </button>
          ) : null}
        </div>

        {/* Cabeçalho e Título Principal */}
        <div className="bg-zinc-950 text-white rounded-3xl p-6 sm:p-7 border-2 border-[#ff6a00] shadow-2xl space-y-4 text-center">
          <div className="inline-flex items-center gap-2 bg-[#ff6a00]/15 text-[#ff6a00] border border-[#ff6a00]/40 px-3.5 py-1 rounded-full text-xs font-heading font-black uppercase tracking-wider">
            <ShieldCheck className="w-4 h-4" />
            <span>Complete seu cadastro para começar a trabalhar</span>
          </div>

          <h2 className="text-2xl sm:text-3xl font-heading font-black text-white tracking-tight">
            Escolha em qual modalidade você vai trabalhar
          </h2>

          <p className="text-xs sm:text-sm text-zinc-300 font-medium max-w-lg mx-auto">
            Olá, <strong className="text-white">{currentUser.name}</strong>! Para receber chamados de passageiros e entregas, selecione uma das 4 modalidades abaixo e informe os dados do veículo.
          </p>

          {!hideLockedOnlineButton && (
            <div className="pt-1">
              <button
                type="button"
                disabled
                className="w-full py-3.5 px-5 rounded-2xl bg-zinc-800 text-zinc-400 font-heading font-black text-xs sm:text-sm flex items-center justify-center gap-2 cursor-not-allowed border border-zinc-700"
              >
                <Lock className="w-4 h-4 shrink-0" />
                <span>Escolha sua categoria para ficar ONLINE</span>
              </button>
            </div>
          )}
        </div>

        {/* 4 Cards Grandes Clicáveis */}
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
          {(Object.keys(WORK_CATEGORIES) as WorkCategoryKey[]).map((catKey) => {
            const cat = WORK_CATEGORIES[catKey];
            return (
              <button
                key={cat.key}
                type="button"
                onClick={() => handleSelectCategory(catKey)}
                className={`p-5 sm:p-6 rounded-3xl border-2 text-left transition-all cursor-pointer flex flex-col justify-between gap-4 shadow-lg hover:shadow-xl active:scale-[0.98] ${
                  catKey === 'motorista_confort'
                    ? 'border-[#ff6a00] bg-gradient-to-br from-[#fff6ef] to-white hover:bg-[#fff0e3]'
                    : catKey === 'motoboy_passageiro'
                    ? 'border-cyan-400 bg-gradient-to-br from-[#f2fbff] to-white hover:border-cyan-600'
                    : catKey === 'motoboy_entregas'
                    ? 'border-amber-400 bg-gradient-to-br from-[#fffaf0] to-white hover:border-amber-600'
                    : 'border-slate-300 bg-white hover:border-slate-900'
                }`}
              >
                <div className="flex items-start justify-between gap-3">
                  <div className="w-16 h-16 rounded-2xl bg-white border border-slate-200 flex items-center justify-center shrink-0 shadow-sm">
                    {cat.icon}
                  </div>
                  <span className="text-xs font-mono font-black px-3 py-1 rounded-full bg-slate-950 text-white">
                    {cat.pricePerKm}
                  </span>
                </div>

                <div className="space-y-1">
                  <h3 className="font-heading font-black text-slate-950 text-lg sm:text-xl">
                    {cat.title}
                  </h3>
                  <p className="text-xs sm:text-sm text-slate-600 font-semibold">
                    {cat.subtitle}
                  </p>
                </div>

                <div className="flex items-center justify-between pt-2 border-t border-slate-200/80 text-xs font-heading font-black text-[#ff6a00]">
                  <span>Selecionar esta modalidade</span>
                  <ArrowRight className="w-4 h-4" />
                </div>
              </button>
            );
          })}
        </div>

        {/* Texto obrigatório embaixo */}
        <p className="text-center text-xs sm:text-sm font-bold text-zinc-400 pt-1">
          Você pode trocar depois em Perfil
        </p>
      </div>
    );
  }

  // ESTÁGIO 2: FORMULÁRIO DA MODALIDADE ESCOLHIDA
  if (stage === 'fill_details') {
    const isCarCategory = selectedCategory.role === 'driver';
    return (
      <div className="space-y-5 max-w-2xl mx-auto py-2 animate-fade-in">
        {/* Navegação e Modalidade Ativa */}
        <div className="flex items-center justify-between border-b border-zinc-800/40 pb-3">
          <button
            type="button"
            onClick={() => setStage('select_category')}
            className="text-amber-400 hover:text-amber-300 text-xs font-bold transition-all cursor-pointer flex items-center gap-1.5 bg-zinc-900 px-3 py-2 rounded-xl border border-zinc-700"
          >
            <ArrowLeft className="w-4 h-4" />
            <span>Voltar para modalidades</span>
          </button>
          <span className="text-xs font-mono font-black text-slate-950 bg-amber-400 px-3.5 py-1.5 rounded-full">
            {selectedCategory.title}
          </span>
        </div>

        {/* Cabeçalho do Formulário */}
        <div className="space-y-1">
          <h2 className="text-xl sm:text-2xl font-heading font-black tracking-tight">
            Cadastro: {selectedCategory.title}
          </h2>
          <p className="text-xs sm:text-sm opacity-80 font-medium">
            Preencha os dados do seu {isCarCategory ? 'carro' : 'veículo'} abaixo para salvar e ficar ONLINE imediatamente.
          </p>
        </div>

        {/* Mensagem de Erro */}
        {errorMessage && (
          <div className="bg-rose-50 border-2 border-rose-400 text-rose-900 text-xs sm:text-sm p-4 rounded-2xl font-bold flex items-center gap-2.5 shadow-sm">
            <AlertTriangle className="w-5 h-5 text-rose-600 shrink-0" />
            <span>{errorMessage}</span>
          </div>
        )}

        <form onSubmit={handleSubmitDetails} className="space-y-4 bg-white text-slate-900 border border-slate-200 p-5 sm:p-6 rounded-3xl shadow-xl">
          <div className="p-3 bg-slate-50 border border-slate-200 rounded-2xl text-xs text-slate-700 flex flex-wrap gap-x-4 gap-y-1">
            <span><strong>Condutor:</strong> {currentUser.name}</span>
            <span><strong>E-mail:</strong> {currentUser.email}</span>
            <span><strong>Modalidade:</strong> {selectedCategory.title}</span>
          </div>

          {isCarCategory ? (
            /* MOTORISTA ECONÔMICO / CONFORT: Placa, Modelo, Ano, Cor, CNH, CPF, Foto do carro, Foto CNH */
            <>
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

              {/* Fotos do Carro e da CNH */}
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 pt-1">
                <label className="flex flex-col items-center justify-center p-4 bg-slate-50 border-2 border-dashed border-slate-300 hover:border-[#ff6a00] rounded-2xl cursor-pointer transition-colors text-center gap-2">
                  <input
                    type="file"
                    accept="image/*"
                    className="hidden"
                    onChange={(e) => {
                      const f = e.target.files?.[0];
                      if (f) compressUploadImage(f, setVehiclePhoto);
                    }}
                  />
                  {vehiclePhoto ? (
                    <>
                      <img src={vehiclePhoto} alt="Foto do carro" className="w-full h-24 object-cover rounded-xl" />
                      <span className="text-xs font-bold text-emerald-700">Foto do carro anexada ✓ (Trocar)</span>
                    </>
                  ) : (
                    <>
                      <Camera className="w-6 h-6 text-[#ff6a00]" />
                      <span className="text-xs font-bold text-slate-800">Foto do carro</span>
                      <span className="text-[11px] text-slate-500">Clique para escolher da galeria ou câmera</span>
                    </>
                  )}
                </label>

                <label className="flex flex-col items-center justify-center p-4 bg-slate-50 border-2 border-dashed border-slate-300 hover:border-[#ff6a00] rounded-2xl cursor-pointer transition-colors text-center gap-2">
                  <input
                    type="file"
                    accept="image/*"
                    className="hidden"
                    onChange={(e) => {
                      const f = e.target.files?.[0];
                      if (f) compressUploadImage(f, setCnhPhoto);
                    }}
                  />
                  {cnhPhoto ? (
                    <>
                      <img src={cnhPhoto} alt="Foto CNH" className="w-full h-24 object-cover rounded-xl" />
                      <span className="text-xs font-bold text-emerald-700">Foto CNH anexada ✓ (Trocar)</span>
                    </>
                  ) : (
                    <>
                      <Camera className="w-6 h-6 text-[#ff6a00]" />
                      <span className="text-xs font-bold text-slate-800">Foto CNH</span>
                      <span className="text-[11px] text-slate-500">Clique para escolher da galeria ou câmera</span>
                    </>
                  )}
                </label>
              </div>
            </>
          ) : (
            /* MOTOBOY PASSAGEIRO / ENTREGAS: Placa moto, Modelo moto, Ano, Cor, CNH A, CPF, Tem baú?, Foto da moto */
            <>
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
                    Cor *
                  </label>
                  <input
                    type="text"
                    required
                    value={color}
                    onChange={(e) => setColor(e.target.value)}
                    placeholder="Ex: Preta, Vermelha, Azul"
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

                <div className="space-y-1.5">
                  <label className="text-xs font-bold text-slate-800 uppercase tracking-wider block">
                    Tem baú? *
                  </label>
                  <select
                    value={hasTrunk}
                    onChange={(e) => setHasTrunk(e.target.value as 'Sim' | 'Não')}
                    className="w-full bg-slate-50 border border-slate-300 rounded-xl px-4 py-3 text-sm font-bold text-slate-900 focus:outline-none focus:border-amber-500 cursor-pointer"
                  >
                    <option value="Sim">Sim, tenho baú / bag</option>
                    <option value="Não">Não</option>
                  </select>
                </div>

                {hasTrunk === 'Sim' && (
                  <div className="space-y-1.5">
                    <label className="text-xs font-bold text-slate-800 uppercase tracking-wider block">
                      Capacidade do Baú
                    </label>
                    <select
                      value={trunkType}
                      onChange={(e) => setTrunkType(e.target.value)}
                      className="w-full bg-slate-50 border border-slate-300 rounded-xl px-4 py-3 text-sm font-medium text-slate-900 focus:outline-none focus:border-amber-500 cursor-pointer"
                    >
                      <option value="Baú 80 Litros">Baú 80 Litros</option>
                      <option value="Baú 90 Litros">Baú 90 Litros</option>
                      <option value="Baú 120 Litros">Baú 120 Litros</option>
                      <option value="Mochila / Bag Térmica (até 20kg)">Mochila / Bag Térmica (até 20kg)</option>
                    </select>
                  </div>
                )}
              </div>

              {/* Foto da Moto */}
              <label className="flex flex-col items-center justify-center p-4 bg-slate-50 border-2 border-dashed border-slate-300 hover:border-[#ff6a00] rounded-2xl cursor-pointer transition-colors text-center gap-2">
                <input
                  type="file"
                  accept="image/*"
                  className="hidden"
                  onChange={(e) => {
                    const f = e.target.files?.[0];
                    if (f) compressUploadImage(f, setVehiclePhoto);
                  }}
                />
                {vehiclePhoto ? (
                  <>
                    <img src={vehiclePhoto} alt="Foto da moto" className="w-full h-28 object-cover rounded-xl" />
                    <span className="text-xs font-bold text-emerald-700">Foto da moto anexada ✓ (Trocar)</span>
                  </>
                ) : (
                  <>
                    <Camera className="w-6 h-6 text-[#ff6a00]" />
                    <span className="text-xs font-bold text-slate-800">Foto da moto</span>
                    <span className="text-[11px] text-slate-500">Clique para escolher da galeria ou câmera</span>
                  </>
                )}
              </label>
            </>
          )}

          {/* Chave PIX Opcional para Saques */}
          <div className="space-y-1.5">
            <label className="text-xs font-bold text-slate-800 uppercase tracking-wider block">
              Chave PIX (para receber seus 85% das corridas toda sexta)
            </label>
            <input
              type="text"
              value={pixKey}
              onChange={(e) => setPixKey(e.target.value)}
              placeholder="Opcional: CPF, e-mail, celular ou chave aleatória"
              className="w-full bg-slate-50 border border-slate-300 rounded-xl px-4 py-3 text-sm font-mono font-medium text-slate-900 focus:outline-none focus:border-amber-500"
            />
          </div>

          <button
            type="submit"
            disabled={isSaving}
            className="w-full py-4 px-6 rounded-2xl bg-emerald-600 hover:bg-emerald-500 disabled:opacity-60 text-white font-heading font-black text-base sm:text-lg transition-all cursor-pointer shadow-lg flex items-center justify-center gap-2 active:scale-[0.99]"
          >
            {isSaving ? (
              <>
                <Loader2 className="w-5 h-5 animate-spin" />
                <span>Salvando no Supabase...</span>
              </>
            ) : (
              <>
                <CheckCircle2 className="w-5 h-5" />
                <span>Salvar e ficar ONLINE</span>
              </>
            )}
          </button>
        </form>
      </div>
    );
  }

  return null;
};
