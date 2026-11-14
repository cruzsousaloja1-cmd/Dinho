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
  Sparkles,
  FileText,
  Lock,
  Loader2,
  Camera,
  LogOut,
  CheckSquare,
  Square,
} from 'lucide-react';
import confetti from 'canvas-confetti';
import { saveUserAccount } from '../services/userService';
import {
  updateMotoristaSupabase,
  saveUsuarioSupabase,
  setDriverRequirementsConfirmedLocal,
} from '../supabase';
import { compressImageToMax200KB } from '../utils/imageCompression';
import { isBasicPopularOneLiterModel } from '../services/vehicleValidationService';

export type WorkCategoryKey =
  | 'motorista_economico'
  | 'motorista_confort'
  | 'motoboy_passageiro'
  | 'motoboy_entregas';

export interface CategoryWorkInfo {
  key: WorkCategoryKey;
  title: string;
  requirementsTitle: string;
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
  minYear: number;
  yearAlertMessage: string;
  hasTrunkType: boolean;
  defaultModel: string;
  defaultYear: string;
  requirementsList: string[];
  vehiclePhotoLabel: string;
  cnhPhotoLabel: string;
  crlvPhotoLabel: string;
}

export const WORK_CATEGORIES: Record<WorkCategoryKey, CategoryWorkInfo> = {
  motorista_economico: {
    key: 'motorista_economico',
    title: 'Motorista Econômico',
    requirementsTitle: 'Motorista Econômico - Requisitos',
    subtitle: 'Carro popular, corridas mais baratas',
    tagline: 'Automóvel 4 portas a partir de 2015 com ar-condicionado',
    badge: 'R$ 2,50/km • 85% para Você',
    pricePerKm: 'R$ 2,50',
    icon: <Car className="w-8 h-8 text-slate-700" />,
    vehicleCategory: 'economica',
    role: 'driver',
    userTipo: 'motorista_economico',
    modelLabel: 'MODELO DO CARRO',
    modelPlaceholder: 'Ex: Chevrolet Onix, Fiat Argo, Hyundai HB20, Renault Kwid',
    hasYear: true,
    minYear: 2015,
    yearAlertMessage:
      'Seu veículo não atende aos requisitos de Motorista Econômico (mínimo 2015). Escolha outra modalidade ou cadastre outro veículo.',
    hasTrunkType: false,
    defaultModel: 'Chevrolet Onix',
    defaultYear: '2020',
    requirementsList: [
      'Automóvel a partir de 2015 (até 10 anos de uso)',
      'Carro com 4 portas, ar-condicionado funcionando',
      'Veículo em bom estado, sem amassados grandes',
      'CNH B válida, sem suspensão',
      'CRLV do veículo em dia',
      'Seguro obrigatório',
      'Carro limpo, com cinto de segurança para todos os passageiros',
    ],
    vehiclePhotoLabel: 'Foto do carro (4 lados)',
    cnhPhotoLabel: 'Foto da CNH',
    crlvPhotoLabel: 'Foto do CRLV',
  },
  motorista_confort: {
    key: 'motorista_confort',
    title: 'Motorista Confort',
    requirementsTitle: 'Motorista Confort - Requisitos',
    subtitle: 'Carro 2020+, mais conforto',
    tagline: 'SUV, Sedã ou Hatch Premium a partir de 2020',
    badge: 'R$ 3,50/km • Carro 2020+',
    pricePerKm: 'R$ 3,50',
    icon: (
      <div className="relative flex items-center justify-center">
        <Car className="w-8 h-8 text-[#ff6a00]" />
        <Sparkles className="w-4 h-4 text-amber-500 absolute -top-1.5 -right-2" />
      </div>
    ),
    vehicleCategory: 'confort',
    role: 'driver',
    userTipo: 'motorista_confort',
    modelLabel: 'MODELO DO CARRO (SUV / SEDÃ / HATCH PREMIUM)',
    modelPlaceholder: 'Ex: Corolla, Honda Civic, T-Cross, Creta, Compass, Nivus, Virtus, Onix Plus',
    hasYear: true,
    minYear: 2020,
    yearAlertMessage:
      'Seu veículo não atende Confort (mínimo 2020). Você pode se cadastrar como Motorista Econômico.',
    hasTrunkType: false,
    defaultModel: 'Toyota Corolla',
    defaultYear: '2022',
    requirementsList: [
      'Automóvel a partir de 2020 (até 5 anos de uso)',
      'SUV, Sedã, ou Hatch Premium - ex: Corolla, Honda Civic, T-Cross, Creta, Compass, Nivus, Virtus, Onix Plus',
      'NÃO aceita carro popular 1.0 básico',
      'Ar-condicionado, vidro elétrico, direção hidráulica',
      'Carro impecável, sem riscos, limpo, com cheirinho',
      'CNH B válida, sem pontos',
      'CRLV em dia, Seguro total',
      'Avaliação mínima 4.8 para continuar no Confort',
    ],
    vehiclePhotoLabel: 'Foto do carro',
    cnhPhotoLabel: 'Foto CNH',
    crlvPhotoLabel: 'Foto CRLV',
  },
  motoboy_passageiro: {
    key: 'motoboy_passageiro',
    title: 'Motoboy Passageiro',
    requirementsTitle: 'Motoboy Passageiro - Requisitos',
    subtitle: 'Levar passageiro de moto',
    tagline: 'Moto a partir de 2018 e mínimo 150cc',
    badge: 'R$ 1,80/km • Moto Táxi',
    pricePerKm: 'R$ 1,80',
    icon: <Bike className="w-8 h-8 text-cyan-500" />,
    vehicleCategory: 'moto_passageiro',
    role: 'motoboy',
    userTipo: 'motoboy_passageiro',
    modelLabel: 'MODELO DA MOTO (MÍN. 150CC)',
    modelPlaceholder: 'Ex: Honda CG 160, Yamaha Fazer 250, Honda CB 300',
    hasYear: true,
    minYear: 2018,
    yearAlertMessage:
      'Sua moto não atende aos requisitos de Motoboy Passageiro (mínimo 2018, 150cc+). Você pode escolher Motoboy Entregas ou cadastrar outra moto.',
    hasTrunkType: false,
    defaultModel: 'Honda CG 160',
    defaultYear: '2022',
    requirementsList: [
      'Moto a partir de 2018 (até 8 anos de uso), mínimo 150cc - ex: Honda CG 160, Yamaha Fazer 250, Honda CB 300',
      'Capacete extra para passageiro, limpo, com viseira',
      'Baú ou alça para passageiro segurar',
      'CNH A válida',
      'CRLV da moto em dia',
      'Seguro obrigatório',
      'Jaqueta, luvas e capa de chuva',
    ],
    vehiclePhotoLabel: 'Foto da moto',
    cnhPhotoLabel: 'Foto CNH A',
    crlvPhotoLabel: 'Foto CRLV',
  },
  motoboy_entregas: {
    key: 'motoboy_entregas',
    title: 'Motoboy Entregas',
    requirementsTitle: 'Motoboy Entregas - Requisitos',
    subtitle: 'Fazer entregas',
    tagline: 'Moto 2015+ (mín. 125cc) com baú fixo mínimo 90L',
    badge: 'R$ 2,00/km • Entregas & Flash',
    pricePerKm: 'R$ 2,00',
    icon: <Package className="w-8 h-8 text-amber-500" />,
    vehicleCategory: 'moto_entrega',
    role: 'motoboy',
    userTipo: 'motoboy_entregas',
    modelLabel: 'MODELO DA MOTO (MÍN. 125CC)',
    modelPlaceholder: 'Ex: Honda CG 160 Start, Honda Biz 125, Yamaha Factor 150',
    hasYear: true,
    minYear: 2015,
    yearAlertMessage:
      'Sua moto não atende aos requisitos de Motoboy Entregas (mínimo 2015, 125cc+). Cadastre uma moto a partir de 2015.',
    hasTrunkType: true,
    defaultModel: 'Honda CG 160 Start',
    defaultYear: '2021',
    requirementsList: [
      'Moto a partir de 2015, mínimo 125cc',
      'Baú de entregas com no mínimo 90L, fixo, com trava, higienizado',
      'CNH A válida',
      'CRLV em dia',
      'Celular com suporte para moto',
    ],
    vehiclePhotoLabel: 'Foto da moto com baú',
    cnhPhotoLabel: 'Foto CNH A',
    crlvPhotoLabel: 'Foto CRLV',
  },
};

export function mapVehicleCategoryToWorkKey(cat?: VehicleCategory): WorkCategoryKey {
  if (cat === 'confort') return 'motorista_confort';
  if (cat === 'moto_passageiro') return 'motoboy_passageiro';
  if (cat === 'moto_entrega') return 'motoboy_entregas';
  return 'motorista_economico';
}

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
  compressImageToMax200KB(file)
    .then((dataUrl) => {
      if (dataUrl) callback(dataUrl);
    })
    .catch((err) => {
      console.log('Erro ao comprimir foto:', err);
    });
}

export const DriverWorkSelectionView: React.FC<DriverWorkSelectionViewProps> = ({
  currentUser,
  onCompleteDriverRegister,
  onBackToRides,
  onLogout,
  isMandatorySetup = false,
  hideLockedOnlineButton = false,
}) => {
  const hasExistingVehicleSetup = Boolean(
    currentUser.driverData?.vehiclePlate?.trim() &&
      currentUser.driverData?.vehicleModel?.trim() &&
      currentUser.driverData?.categoryConfigured !== false
  );

  const initialKey: WorkCategoryKey = hasExistingVehicleSetup
    ? mapVehicleCategoryToWorkKey(currentUser.driverData?.category)
    : currentUser.role === 'motoboy'
    ? 'motoboy_passageiro'
    : 'motorista_economico';

  const [stage, setStage] = useState<'select_category' | 'fill_details'>(
    hasExistingVehicleSetup ? 'fill_details' : 'select_category'
  );
  const [selectedKey, setSelectedKey] = useState<WorkCategoryKey>(initialKey);

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
    currentUser.driverData?.hasTrunk !== false ? 'Sim' : 'Não'
  );
  const [trunkType, setTrunkType] = useState(() => {
    const existing = currentUser.driverData?.trunkType || '';
    if (existing.includes('100')) return 'Baú 100 Litros';
    if (existing.includes('120')) return 'Baú 120 Litros';
    if (existing.includes('135')) return 'Baú 135 Litros';
    return 'Baú 90 Litros';
  });
  const [color, setColor] = useState(currentUser.driverData?.vehicleColor || '');
  const [vehiclePhoto, setVehiclePhoto] = useState(currentUser.driverData?.vehiclePhoto || '');
  const [cnhPhoto, setCnhPhoto] = useState(currentUser.driverData?.cnhPhoto || '');
  const [crlvPhoto, setCrlvPhoto] = useState(currentUser.driverData?.crlvPhoto || '');
  const [requirementsChecked, setRequirementsChecked] = useState<boolean>(false);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const [isSaving, setIsSaving] = useState(false);

  const selectedCategory = WORK_CATEGORIES[selectedKey];

  const handleSelectCategory = (key: WorkCategoryKey) => {
    setSelectedKey(key);
    const cat = WORK_CATEGORIES[key];
    if (!hasExistingVehicleSetup) {
      setModel('');
      setYear(cat.defaultYear);
    } else if (!year) {
      setYear(cat.defaultYear);
    }
    if (key === 'motoboy_entregas') {
      setHasTrunk('Sim');
      if (!trunkType || trunkType === 'Não' || trunkType.includes('80')) {
        setTrunkType('Baú 90 Litros');
      }
    } else if (key === 'motoboy_passageiro') {
      setHasTrunk('Não');
    }
    setRequirementsChecked(false);
    setErrorMessage(null);
    setStage('fill_details');
  };

  // Validação em tempo real do ano e modelo conforme a modalidade selecionada
  const parsedYear = parseInt(year.trim(), 10);
  const hasTypedFullYear = year.trim().length === 4 && !Number.isNaN(parsedYear);
  const isYearBelowMinimum = hasTypedFullYear && parsedYear < selectedCategory.minYear;
  const isConfortPopularOneLiter =
    selectedCategory.key === 'motorista_confort' && isBasicPopularOneLiterModel(model);
  const isEntregasMissingTrunk =
    selectedCategory.key === 'motoboy_entregas' && hasTrunk !== 'Sim';

  const getLiveBlockingAlert = (): string | null => {
    if (isYearBelowMinimum) {
      return selectedCategory.yearAlertMessage;
    }
    if (isConfortPopularOneLiter) {
      return 'Motorista Confort NÃO aceita carro popular 1.0 básico. Você pode se cadastrar como Motorista Econômico.';
    }
    if (isEntregasMissingTrunk) {
      return 'Motoboy Entregas exige baú fixo com no mínimo 90L, com trava e higienizado.';
    }
    return null;
  };

  const liveBlockingAlert = getLiveBlockingAlert();

  const handleSubmitDetails = async (e: React.FormEvent) => {
    e.preventDefault();
    setErrorMessage(null);

    const isCarCategory = selectedCategory.role === 'driver';
    const isDeliveryMoto = selectedCategory.key === 'motoboy_entregas';
    const cleanPlate = plate.trim().toUpperCase();
    const cleanModel = model.trim();
    const cleanCnh = cnh.trim();
    const cleanColor = color.trim() || (isDeliveryMoto ? 'Não informada' : '');
    const cleanCpf = cpf.trim();
    const cleanBau = isCarCategory
      ? ''
      : hasTrunk === 'Sim'
      ? `Sim (${trunkType})`
      : 'Não';
    const yearNum = parseInt(year.trim(), 10);

    if (!cleanPlate || !cleanModel || !year.trim() || Number.isNaN(yearNum)) {
      setErrorMessage('Preencha Placa, Modelo e Ano do veículo.');
      return;
    }

    if (yearNum < selectedCategory.minYear) {
      setErrorMessage(selectedCategory.yearAlertMessage);
      return;
    }

    if (selectedCategory.key === 'motorista_confort' && isBasicPopularOneLiterModel(cleanModel)) {
      setErrorMessage(
        'Motorista Confort NÃO aceita carro popular 1.0 básico. Você pode se cadastrar como Motorista Econômico.'
      );
      return;
    }

    if (isCarCategory) {
      if (!cleanColor || !cleanCnh || !cleanCpf) {
        setErrorMessage('Preencha todos os campos obrigatórios: Placa, Modelo, Ano, Cor, CNH e CPF.');
        return;
      }
    } else if (selectedCategory.key === 'motoboy_passageiro') {
      if (!cleanColor || !cleanCnh || !cleanCpf) {
        setErrorMessage('Preencha todos os campos obrigatórios: Placa moto, Modelo moto, Ano, Cor, CNH A e CPF.');
        return;
      }
    } else if (isDeliveryMoto) {
      if (hasTrunk !== 'Sim') {
        setErrorMessage('Motoboy Entregas exige baú fixo de no mínimo 90L.');
        return;
      }
      if (!cleanCnh || !cleanCpf) {
        setErrorMessage('Preencha CNH A válida e CPF para concluir seu cadastro.');
        return;
      }
    }

    if (!requirementsChecked) {
      setErrorMessage('Marque a caixa obrigatória: "Li e confirmo que meu veículo atende a todas as exigências acima".');
      return;
    }

    setIsSaving(true);
    try {
      const existingDriver = currentUser.driverData;
      const confirmedTimestamp = new Date().toISOString();
      setDriverRequirementsConfirmedLocal(currentUser.email, true);

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
        requirementsConfirmed: true,
        requirementsConfirmedAt: confirmedTimestamp,
        vehicleModel: cleanModel,
        vehiclePlate: cleanPlate,
        vehicleColor: cleanColor,
        vehicleYear: yearNum,
        vehiclePhoto: vehiclePhoto || undefined,
        cnhPhoto: cnhPhoto || undefined,
        crlvPhoto: crlvPhoto || undefined,
        hasTrunk: !isCarCategory && hasTrunk === 'Sim',
        rating: existingDriver?.rating || currentUser.rating || 0,
        totalRides: existingDriver?.totalRides || 0,
        status: 'online',
        lat: existingDriver?.lat || -23.0903,
        lng: existingDriver?.lng || -47.2180,
        weeklyPlanActive: true,
        weeklyFeePaidAt: existingDriver?.weeklyFeePaidAt || confirmedTimestamp,
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
        registrationDate: existingDriver?.registrationDate || confirmedTimestamp.split('T')[0],
        comfortEligible: selectedCategory.key === 'motorista_confort',
        comfortEligibilityReason:
          selectedCategory.key === 'motorista_confort'
            ? 'Aprovado para Confort (2020+)'
            : undefined,
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
        createdAt: confirmedTimestamp,
      };

      saveUserAccount(updatedAccount, true);

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
        foto_crlv: crlvPhoto,
        exigencias_confirmadas: true,
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
          foto_crlv: crlvPhoto,
          exigencias_confirmadas: true,
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
          <div className="flex items-center gap-2 flex-wrap">
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
            Olá, <strong className="text-white">{currentUser.name}</strong>! Selecione uma das 4 modalidades abaixo para ver os requisitos obrigatórios, informar os dados do veículo e confirmar suas exigências.
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

        {/* 4 Cards Grandes Clicáveis com Prévia dos Requisitos */}
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

                <div className="space-y-1.5">
                  <h3 className="font-heading font-black text-slate-950 text-lg sm:text-xl">
                    {cat.title}
                  </h3>
                  <p className="text-xs sm:text-sm text-slate-600 font-semibold">
                    {cat.subtitle}
                  </p>
                  <p className="text-[11px] font-bold text-slate-500">
                    • {cat.requirementsList[0]}
                  </p>
                </div>

                <div className="flex items-center justify-between pt-2 border-t border-slate-200/80 text-xs font-heading font-black text-[#ff6a00]">
                  <span>Ver requisitos e selecionar</span>
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

  // ESTÁGIO 2: EXIGÊNCIAS DA MODALIDADE + FORMULÁRIO + CHECKBOX OBRIGATÓRIO
  if (stage === 'fill_details') {
    const isCarCategory = selectedCategory.role === 'driver';
    const isDeliveryMoto = selectedCategory.key === 'motoboy_entregas';
    const isSaveBlocked = isSaving || !requirementsChecked || Boolean(liveBlockingAlert);

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

        {/* Aviso para cadastros já existentes confirmarem exigências */}
        {hasExistingVehicleSetup && !currentUser.driverData?.requirementsConfirmed && (
          <div className="bg-amber-50 border-2 border-amber-400 text-amber-950 rounded-2xl p-4 flex items-start gap-3 shadow-sm">
            <ShieldCheck className="w-5 h-5 text-amber-700 shrink-0 mt-0.5" />
            <div className="text-xs sm:text-sm font-bold">
              Cadastro já existente localizado! Seus dados foram mantidos abaixo — revise os requisitos da modalidade e marque a confirmação obrigatória para voltar a ficar ONLINE.
            </div>
          </div>
        )}

        {/* Cabeçalho do Formulário */}
        <div className="space-y-1">
          <h2 className="text-xl sm:text-2xl font-heading font-black tracking-tight">
            Cadastro: {selectedCategory.title}
          </h2>
          <p className="text-xs sm:text-sm opacity-80 font-medium">
            Confira as exigências, preencha os dados do seu {isCarCategory ? 'carro' : 'veículo'} e confirme os requisitos para salvar e ficar ONLINE.
          </p>
        </div>

        {/* CARD OFICIAL DE EXIGÊNCIAS DA MODALIDADE ESCOLHIDA */}
        <div
          className={`rounded-3xl p-5 sm:p-6 border-2 shadow-md space-y-3 ${
            selectedCategory.key === 'motorista_confort'
              ? 'bg-[#fff8f2] border-[#ff6a00] text-slate-900'
              : selectedCategory.key === 'motoboy_passageiro'
              ? 'bg-cyan-50 border-cyan-500 text-slate-900'
              : selectedCategory.key === 'motoboy_entregas'
              ? 'bg-amber-50 border-amber-500 text-slate-900'
              : 'bg-slate-50 border-slate-800 text-slate-900'
          }`}
        >
          <div className="flex items-center justify-between gap-2 border-b border-slate-200 pb-3">
            <div className="flex items-center gap-2.5">
              <FileText className="w-5 h-5 text-[#ff6a00] shrink-0" />
              <h3 className="font-heading font-black text-base sm:text-lg text-slate-950">
                {selectedCategory.requirementsTitle}
              </h3>
            </div>
            <span className="text-[11px] font-mono font-black px-2.5 py-1 rounded-full bg-slate-950 text-white shrink-0">
              Ano {selectedCategory.minYear}+
            </span>
          </div>

          <ul className="space-y-2">
            {selectedCategory.requirementsList.map((req, idx) => (
              <li key={idx} className="flex items-start gap-2.5 text-xs sm:text-sm font-semibold text-slate-800">
                <CheckCircle2 className="w-4 h-4 text-emerald-600 shrink-0 mt-0.5" />
                <span>{req}</span>
              </li>
            ))}
          </ul>
        </div>

        {/* Alerta em Tempo Real se Ano / Modelo / Baú não atenderem */}
        {liveBlockingAlert && (
          <div className="bg-rose-50 border-2 border-rose-500 text-rose-950 text-xs sm:text-sm p-4 rounded-2xl font-bold space-y-2.5 shadow-md">
            <div className="flex items-start gap-2.5">
              <AlertTriangle className="w-5 h-5 text-rose-600 shrink-0 mt-0.5" />
              <span>{liveBlockingAlert}</span>
            </div>
            {selectedCategory.key === 'motorista_confort' && (
              <button
                type="button"
                onClick={() => handleSelectCategory('motorista_economico')}
                className="px-4 py-2 rounded-xl bg-slate-900 hover:bg-slate-800 text-white font-heading font-black text-xs cursor-pointer transition-all"
              >
                Mudar para Motorista Econômico
              </button>
            )}
          </div>
        )}

        {/* Mensagem de Erro de Submit */}
        {errorMessage && (
          <div className="bg-rose-50 border-2 border-rose-400 text-rose-900 text-xs sm:text-sm p-4 rounded-2xl font-bold flex items-center gap-2.5 shadow-sm">
            <AlertTriangle className="w-5 h-5 text-rose-600 shrink-0" />
            <span>{errorMessage}</span>
          </div>
        )}

        <form
          onSubmit={handleSubmitDetails}
          className="space-y-4 bg-white text-slate-900 border border-slate-200 p-5 sm:p-6 rounded-3xl shadow-xl"
        >
          <div className="p-3 bg-slate-50 border border-slate-200 rounded-2xl text-xs text-slate-700 flex flex-wrap gap-x-4 gap-y-1">
            <span>
              <strong>Condutor:</strong> {currentUser.name}
            </span>
            <span>
              <strong>E-mail:</strong> {currentUser.email}
            </span>
            <span>
              <strong>Modalidade:</strong> {selectedCategory.title}
            </span>
          </div>

          {isCarCategory ? (
            /* MOTORISTA ECONÔMICO / CONFORT: Placa, Modelo, Ano, Cor, CNH, CPF, Foto do carro (4 lados), Foto da CNH, Foto do CRLV */
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
                    min={1995}
                    max={2027}
                    value={year}
                    onChange={(e) => setYear(e.target.value)}
                    placeholder={selectedCategory.key === 'motorista_confort' ? 'Ex: 2022' : 'Ex: 2019'}
                    className={`w-full bg-slate-50 border rounded-xl px-4 py-3 text-sm font-medium text-slate-900 focus:outline-none ${
                      isYearBelowMinimum
                        ? 'border-rose-500 bg-rose-50 text-rose-900'
                        : 'border-slate-300 focus:border-amber-500'
                    }`}
                  />
                  <span className="text-[11px] font-bold text-slate-500 block">
                    Exigência mínima: ano {selectedCategory.minYear} ou superior.
                  </span>
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
                    CNH B *
                  </label>
                  <input
                    type="text"
                    required
                    value={cnh}
                    onChange={(e) => setCnh(e.target.value)}
                    placeholder="Número da CNH B válida"
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

              {/* Fotos do Carro, CNH e CRLV */}
              <div className="grid grid-cols-1 sm:grid-cols-3 gap-3.5 pt-1">
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
                      <img src={vehiclePhoto} alt={selectedCategory.vehiclePhotoLabel} className="w-full h-24 object-cover rounded-xl" />
                      <span className="text-xs font-bold text-emerald-700">{selectedCategory.vehiclePhotoLabel} ✓</span>
                    </>
                  ) : (
                    <>
                      <Camera className="w-6 h-6 text-[#ff6a00]" />
                      <span className="text-xs font-bold text-slate-800">{selectedCategory.vehiclePhotoLabel}</span>
                      <span className="text-[11px] text-slate-500">Galeria ou câmera</span>
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
                      <img src={cnhPhoto} alt={selectedCategory.cnhPhotoLabel} className="w-full h-24 object-cover rounded-xl" />
                      <span className="text-xs font-bold text-emerald-700">{selectedCategory.cnhPhotoLabel} ✓</span>
                    </>
                  ) : (
                    <>
                      <Camera className="w-6 h-6 text-[#ff6a00]" />
                      <span className="text-xs font-bold text-slate-800">{selectedCategory.cnhPhotoLabel}</span>
                      <span className="text-[11px] text-slate-500">Galeria ou câmera</span>
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
                      if (f) compressUploadImage(f, setCrlvPhoto);
                    }}
                  />
                  {crlvPhoto ? (
                    <>
                      <img src={crlvPhoto} alt={selectedCategory.crlvPhotoLabel} className="w-full h-24 object-cover rounded-xl" />
                      <span className="text-xs font-bold text-emerald-700">{selectedCategory.crlvPhotoLabel} ✓</span>
                    </>
                  ) : (
                    <>
                      <Camera className="w-6 h-6 text-[#ff6a00]" />
                      <span className="text-xs font-bold text-slate-800">{selectedCategory.crlvPhotoLabel}</span>
                      <span className="text-[11px] text-slate-500">Documento em dia</span>
                    </>
                  )}
                </label>
              </div>
            </>
          ) : (
            /* MOTOBOY PASSAGEIRO / ENTREGAS */
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
                    min={1995}
                    max={2027}
                    value={year}
                    onChange={(e) => setYear(e.target.value)}
                    placeholder={selectedCategory.key === 'motoboy_passageiro' ? 'Ex: 2022' : 'Ex: 2020'}
                    className={`w-full bg-slate-50 border rounded-xl px-4 py-3 text-sm font-medium text-slate-900 focus:outline-none ${
                      isYearBelowMinimum
                        ? 'border-rose-500 bg-rose-50 text-rose-900'
                        : 'border-slate-300 focus:border-amber-500'
                    }`}
                  />
                  <span className="text-[11px] font-bold text-slate-500 block">
                    Exigência mínima: ano {selectedCategory.minYear} ou superior.
                  </span>
                </div>

                <div className="space-y-1.5">
                  <label className="text-xs font-bold text-slate-800 uppercase tracking-wider block">
                    Cor {isDeliveryMoto ? '(Opcional)' : '*'}
                  </label>
                  <input
                    type="text"
                    required={!isDeliveryMoto}
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
                    placeholder="Número da CNH A válida"
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
                    <option value="Sim">Sim, tenho baú fixo</option>
                    <option value="Não">Não</option>
                  </select>
                </div>

                {hasTrunk === 'Sim' && (
                  <div className="space-y-1.5">
                    <label className="text-xs font-bold text-slate-800 uppercase tracking-wider block">
                      Tamanho do baú {isDeliveryMoto ? '(mín. 90L) *' : ''}
                    </label>
                    <select
                      value={trunkType}
                      onChange={(e) => setTrunkType(e.target.value)}
                      className="w-full bg-slate-50 border border-slate-300 rounded-xl px-4 py-3 text-sm font-medium text-slate-900 focus:outline-none focus:border-amber-500 cursor-pointer"
                    >
                      <option value="Baú 90 Litros">Baú 90 Litros (Mínimo Entregas)</option>
                      <option value="Baú 100 Litros">Baú 100 Litros</option>
                      <option value="Baú 120 Litros">Baú 120 Litros</option>
                      <option value="Baú 135 Litros">Baú 135 Litros</option>
                    </select>
                  </div>
                )}
              </div>

              {/* Fotos: Moto (ou Moto com Baú), CNH A e CRLV */}
              <div className="grid grid-cols-1 sm:grid-cols-3 gap-3.5 pt-1">
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
                      <img src={vehiclePhoto} alt={selectedCategory.vehiclePhotoLabel} className="w-full h-24 object-cover rounded-xl" />
                      <span className="text-xs font-bold text-emerald-700">{selectedCategory.vehiclePhotoLabel} ✓</span>
                    </>
                  ) : (
                    <>
                      <Camera className="w-6 h-6 text-[#ff6a00]" />
                      <span className="text-xs font-bold text-slate-800">{selectedCategory.vehiclePhotoLabel}</span>
                      <span className="text-[11px] text-slate-500">Galeria ou câmera</span>
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
                      <img src={cnhPhoto} alt={selectedCategory.cnhPhotoLabel} className="w-full h-24 object-cover rounded-xl" />
                      <span className="text-xs font-bold text-emerald-700">{selectedCategory.cnhPhotoLabel} ✓</span>
                    </>
                  ) : (
                    <>
                      <Camera className="w-6 h-6 text-[#ff6a00]" />
                      <span className="text-xs font-bold text-slate-800">{selectedCategory.cnhPhotoLabel}</span>
                      <span className="text-[11px] text-slate-500">Galeria ou câmera</span>
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
                      if (f) compressUploadImage(f, setCrlvPhoto);
                    }}
                  />
                  {crlvPhoto ? (
                    <>
                      <img src={crlvPhoto} alt={selectedCategory.crlvPhotoLabel} className="w-full h-24 object-cover rounded-xl" />
                      <span className="text-xs font-bold text-emerald-700">{selectedCategory.crlvPhotoLabel} ✓</span>
                    </>
                  ) : (
                    <>
                      <Camera className="w-6 h-6 text-[#ff6a00]" />
                      <span className="text-xs font-bold text-slate-800">{selectedCategory.crlvPhotoLabel}</span>
                      <span className="text-[11px] text-slate-500">Documento em dia</span>
                    </>
                  )}
                </label>
              </div>
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

          {/* CHECKBOX OBRIGATÓRIO ANTES DE "Salvar e ficar ONLINE" */}
          <label
            onClick={() => setRequirementsChecked((prev) => !prev)}
            className={`flex items-start gap-3 p-4 rounded-2xl border-2 cursor-pointer transition-all select-none ${
              requirementsChecked
                ? 'bg-emerald-50 border-emerald-500 text-emerald-950'
                : 'bg-amber-50 border-amber-400 text-slate-900 hover:border-[#ff6a00]'
            }`}
          >
            <input
              type="checkbox"
              checked={requirementsChecked}
              onChange={(e) => setRequirementsChecked(e.target.checked)}
              className="sr-only"
            />
            {requirementsChecked ? (
              <CheckSquare className="w-6 h-6 text-emerald-600 shrink-0 mt-0.5" />
            ) : (
              <Square className="w-6 h-6 text-amber-700 shrink-0 mt-0.5" />
            )}
            <span className="text-xs sm:text-sm font-black leading-snug">
              Li e confirmo que meu veículo atende a todas as exigências acima
            </span>
          </label>

          <button
            type="submit"
            disabled={isSaveBlocked}
            className={`w-full py-4 px-6 rounded-2xl font-heading font-black text-base sm:text-lg transition-all shadow-lg flex items-center justify-center gap-2 ${
              isSaveBlocked
                ? 'bg-slate-300 text-slate-600 border-2 border-slate-400 cursor-not-allowed opacity-85'
                : 'bg-emerald-600 hover:bg-emerald-500 text-white cursor-pointer active:scale-[0.99]'
            }`}
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
