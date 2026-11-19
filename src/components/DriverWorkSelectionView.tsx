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
  User,
} from 'lucide-react';
import confetti from 'canvas-confetti';
import { saveUserAccount, isAppUserAdmin } from '../services/userService';
import {
  updateMotoristaSupabase,
  saveUsuarioSupabase,
  setDriverRequirementsConfirmedLocal,
  saveDriverApplicationSupabase,
  uploadProfilePhotoSupabase,
} from '../supabase';
import { compressImageToMax200KB } from '../utils/imageCompression';
import { isBasicPopularOneLiterModel } from '../services/vehicleValidationService';
import { LegalConsentSection } from './LegalConsentSection';
import { LaunchPromoBanner } from './LaunchPromoBanner';
import { validateCPF, validateCNH, validatePlate } from '../utils/documentValidation';

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
    vehiclePhotoLabel: 'Foto do carro (Frente)',
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
    vehiclePhotoLabel: 'Foto do carro (Frente)',
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
  onOpenAdminPanel?: () => void;
  onRenewWeeklyPlan?: (driver?: Driver) => void;
  onLogout?: () => void;
  onOpenPrivacyPage?: () => void;
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
  onOpenAdminPanel,
  onLogout,
  onOpenPrivacyPage,
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

  const isRejectedResubmission = currentUser.driverData?.approvalStatus === 'reprovado';
  const rejectionMessage = String(currentUser.driverData?.rejectionReason || '').trim();

  const detectRejectedStep = (reason: string): 1 | 2 | 3 | 4 | 5 | 6 => {
    const lower = reason.toLowerCase();
    if (lower.includes('perfil') || lower.includes('rosto')) return 1;
    if (lower.includes('cnh frente') || lower.includes('cnh (frente)')) return 2;
    if (lower.includes('cnh verso') || lower.includes('cnh (verso)')) return 3;
    if (lower.includes('crlv')) return 4;
    if (lower.includes('carro') || lower.includes('moto') || lower.includes('veículo') || lower.includes('veiculo')) return 5;
    return 1;
  };

  const [stage, setStage] = useState<'select_category' | 'fill_details'>(
    hasExistingVehicleSetup || isRejectedResubmission ? 'fill_details' : 'select_category'
  );
  const [selectedKey, setSelectedKey] = useState<WorkCategoryKey>(initialKey);
  const [wizardStep, setWizardStep] = useState<1 | 2 | 3 | 4 | 5 | 6>(() =>
    isRejectedResubmission ? detectRejectedStep(rejectionMessage) : 1
  );

  // Passo 1 a 5: Fotos obrigatórias na ordem (estilo Uber, só 1 foto da frente do carro)
  const [profilePhoto, setProfilePhoto] = useState(
    currentUser.avatar || currentUser.driverData?.avatar || ''
  );
  const [profilePhotoFile, setProfilePhotoFile] = useState<File | null>(null);
  const [cnhFrontPhoto, setCnhFrontPhoto] = useState(
    currentUser.driverData?.cnhFrontPhoto || currentUser.driverData?.cnhPhoto || ''
  );
  const [cnhBackPhoto, setCnhBackPhoto] = useState(currentUser.driverData?.cnhBackPhoto || '');
  const [crlvPhoto, setCrlvPhoto] = useState(currentUser.driverData?.crlvPhoto || '');
  const [vehiclePhoto, setVehiclePhoto] = useState(currentUser.driverData?.vehiclePhoto || '');

  // Passo 6: Dados do veículo + CPF + Chave PIX
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
  const [acceptedContract, setAcceptedContract] = useState<boolean>(false);
  const [acceptedTerms, setAcceptedTerms] = useState<boolean>(false);
  const [acceptedLgpd, setAcceptedLgpd] = useState<boolean>(false);
  const [acceptedPrivacy, setAcceptedPrivacy] = useState<boolean>(false);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const [isSaving, setIsSaving] = useState(false);

  const selectedCategory = WORK_CATEGORIES[selectedKey];
  const isCarCategoryGlobal = selectedCategory.role === 'driver';

  const getStepMissingMessage = (step: 1 | 2 | 3 | 4 | 5): string | null => {
    if (step === 1 && !profilePhoto) {
      return 'Envie a foto de perfil (rosto) para continuar.';
    }
    if (step === 2 && !cnhFrontPhoto) {
      return 'Envie a foto da CNH Frente para continuar.';
    }
    if (step === 3 && !cnhBackPhoto) {
      return 'Envie a foto da CNH Verso para continuar.';
    }
    if (step === 4 && !crlvPhoto) {
      return 'Envie a foto do CRLV para continuar.';
    }
    if (step === 5 && !vehiclePhoto) {
      return isCarCategoryGlobal
        ? 'Envie a foto do carro (Frente) para continuar.'
        : 'Envie a foto da moto para continuar.';
    }
    return null;
  };

  const handleAttemptStepNavigation = (targetStep: 1 | 2 | 3 | 4 | 5 | 6) => {
    if (targetStep <= wizardStep) {
      setErrorMessage(null);
      setWizardStep(targetStep);
      return;
    }
    for (let s = 1 as 1 | 2 | 3 | 4 | 5; s < targetStep; s = (s + 1) as 1 | 2 | 3 | 4 | 5) {
      const missingMsg = getStepMissingMessage(s);
      if (missingMsg) {
        setErrorMessage(missingMsg);
        setWizardStep(s);
        return;
      }
    }
    setErrorMessage(null);
    setWizardStep(targetStep);
  };

  const handleNextWizardStep = () => {
    if (wizardStep >= 6) return;
    const missingMsg = getStepMissingMessage(wizardStep as 1 | 2 | 3 | 4 | 5);
    if (missingMsg) {
      setErrorMessage(missingMsg);
      return;
    }
    setErrorMessage(null);
    setWizardStep((wizardStep + 1) as 1 | 2 | 3 | 4 | 5 | 6);
  };

  const handlePrevWizardStep = () => {
    setErrorMessage(null);
    if (wizardStep === 1) {
      setStage('select_category');
      return;
    }
    setWizardStep((wizardStep - 1) as 1 | 2 | 3 | 4 | 5 | 6);
  };

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
    setAcceptedContract(false);
    setAcceptedTerms(false);
    setAcceptedLgpd(false);
    setAcceptedPrivacy(false);
    setErrorMessage(null);
    setWizardStep(isRejectedResubmission ? detectRejectedStep(rejectionMessage) : 1);
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

    // TRAVA ABSOLUTA DE ADM: nunca salvar modalidade/motorista_economico sobre conta ADM
    if (isAppUserAdmin(currentUser)) {
      onOpenAdminPanel?.();
      return;
    }

    // Garante que nenhum dos 5 passos de foto foi pulado
    for (const stepNum of [1, 2, 3, 4, 5] as const) {
      const missingMsg = getStepMissingMessage(stepNum);
      if (missingMsg) {
        setErrorMessage(missingMsg);
        setWizardStep(stepNum);
        return;
      }
    }

    const isCarCategory = selectedCategory.role === 'driver';
    const isDeliveryMoto = selectedCategory.key === 'motoboy_entregas';
    const cleanPlate = plate.trim().toUpperCase();
    const cleanModel = model.trim();
    const cleanCnh = cnh.trim();
    const cleanColor = color.trim();
    const cleanCpf = cpf.trim();
    const cleanPix = pixKey.trim();
    const cleanBau = isCarCategory
      ? ''
      : hasTrunk === 'Sim'
      ? `Sim (${trunkType})`
      : 'Não';
    const yearNum = parseInt(year.trim(), 10);

    if (!cleanModel || !cleanColor || !cleanPlate || !year.trim() || Number.isNaN(yearNum)) {
      setErrorMessage('Preencha Modelo, Cor, Placa e Ano do veículo.');
      return;
    }

    const plateCheck = validatePlate(cleanPlate);
    if (!plateCheck.valid) {
      setErrorMessage(plateCheck.error || 'Placa inválida. Digite ABC-1234 ou ABC1D23.');
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

    if (!cleanCpf || !cleanPix) {
      setErrorMessage('Preencha CPF e Chave PIX para continuar.');
      return;
    }

    const cpfCheck = validateCPF(cleanCpf);
    if (!cpfCheck.valid) {
      setErrorMessage(cpfCheck.error || 'CPF inválido. Digite o CPF correto.');
      return;
    }

    if (!cleanCnh) {
      setErrorMessage(
        isCarCategory
          ? 'Preencha o número da CNH B para concluir o cadastro.'
          : 'Preencha o número da CNH A para concluir o cadastro.'
      );
      return;
    }

    const cnhCheck = validateCNH(cleanCnh);
    if (!cnhCheck.valid) {
      setErrorMessage(cnhCheck.error || 'CNH inválida.');
      return;
    }

    const validatedPlate = plateCheck.normalized || cleanPlate;
    const validatedCpf = cpfCheck.normalized || cleanCpf;
    const validatedCnh = cnhCheck.normalized || cleanCnh;

    if (isDeliveryMoto && hasTrunk !== 'Sim') {
      setErrorMessage('Motoboy Entregas exige baú fixo de no mínimo 90L.');
      return;
    }

    if (!acceptedContract || !acceptedTerms || !acceptedLgpd || !acceptedPrivacy) {
      setErrorMessage('Marque os 4 documentos para trabalhar');
      return;
    }

    setIsSaving(true);
    try {
      const existingDriver = currentUser.driverData;
      const confirmedTimestamp = new Date().toISOString();
      setDriverRequirementsConfirmedLocal(currentUser.email, true);
      const keepApproved = existingDriver?.approvalStatus === 'aprovado';
      const nextApprovalStatus = keepApproved ? 'aprovado' : 'pendente';

      let finalAvatarUrl = profilePhoto || currentUser.avatar || existingDriver?.avatar || '';
      if (profilePhotoFile) {
        try {
          const uploadRes = await uploadProfilePhotoSupabase({
            photo: profilePhotoFile,
            identifier: currentUser.email || currentUser.id,
          });
          if (uploadRes?.url) {
            finalAvatarUrl = uploadRes.url;
          }
        } catch {
          // Mantém preview comprimido em base64 caso Storage falhe
        }
      }

      const newDriver: Driver = {
        ...(existingDriver || {}),
        id: existingDriver?.id || currentUser.id || '',
        name: currentUser.name,
        avatar: finalAvatarUrl,
        phone: currentUser.phone,
        email: currentUser.email,
        cpf: validatedCpf,
        cnh: validatedCnh,
        category: selectedCategory.vehicleCategory,
        categoryConfigured: true,
        requirementsConfirmed: true,
        requirementsConfirmedAt: confirmedTimestamp,
        documentosAceitos: true,
        dataAceite: confirmedTimestamp,
        vehicleModel: cleanModel,
        vehiclePlate: validatedPlate,
        vehicleColor: cleanColor,
        vehicleYear: yearNum,
        vehiclePhoto: vehiclePhoto || undefined,
        cnhPhoto: cnhFrontPhoto || undefined,
        cnhFrontPhoto: cnhFrontPhoto || undefined,
        cnhBackPhoto: cnhBackPhoto || undefined,
        crlvPhoto: crlvPhoto || undefined,
        approvalStatus: nextApprovalStatus,
        rejectionReason: nextApprovalStatus === 'pendente' ? '' : existingDriver?.rejectionReason,
        hasTrunk: !isCarCategory && hasTrunk === 'Sim',
        rating: existingDriver?.rating || currentUser.rating || 0,
        totalRides: existingDriver?.totalRides || 0,
        status: nextApprovalStatus === 'aprovado' ? 'offline' : 'pending_approval',
        lat: existingDriver?.lat || -23.0903,
        lng: existingDriver?.lng || -47.2180,
        weeklyPlanActive: true,
        weeklyFeePaidAt: existingDriver?.weeklyFeePaidAt || confirmedTimestamp,
        weeklyFeeExpiresAt: null,
        weeklyPlanExpiresAt: null,
        weeklyPlanPrice: 0,
        pixKey: cleanPix,
        trunkType: isCarCategory ? undefined : cleanBau,
        earningsToday: existingDriver?.earningsToday || 0,
        earningsWeek: existingDriver?.earningsWeek || 0,
        walletBalance: existingDriver?.walletBalance || 0,
        cnhVerified: nextApprovalStatus === 'aprovado',
        vehicleVerified: nextApprovalStatus === 'aprovado',
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
        role: selectedCategory.role,
        tipo: selectedCategory.userTipo,
        placa: cleanPlate,
        avatar: finalAvatarUrl,
        rating: newDriver.rating,
        driverData: newDriver,
        createdAt: confirmedTimestamp,
      };

      saveUserAccount({
        ...updatedAccount,
        documentos_aceitos: true,
        aceitou_contrato: true,
        aceitou_termos: true,
        aceitou_lgpd: true,
        data_aceite: confirmedTimestamp,
      }, true);

      await saveDriverApplicationSupabase({
        id: newDriver.id,
        email: currentUser.email,
        name: currentUser.name,
        phone: currentUser.phone,
        whatsapp: currentUser.whatsapp || currentUser.phone,
        category: selectedCategory.vehicleCategory,
        vehicleModel: cleanModel,
        vehicleColor: cleanColor,
        vehiclePlate: cleanPlate,
        vehicleYear: yearNum,
        cnh: cleanCnh,
        cpf: cleanCpf,
        pixKey: cleanPix,
        avatar: finalAvatarUrl,
        cnhFrontPhoto,
        cnhBackPhoto,
        crlvPhoto,
        vehiclePhoto,
        approvalStatus: nextApprovalStatus,
        rejectionReason: nextApprovalStatus === 'pendente' ? '' : existingDriver?.rejectionReason,
        online: false,
        driverStatus: nextApprovalStatus === 'aprovado' ? 'offline' : 'pending_approval',
        documentosAceitos: true,
        dataAceite: confirmedTimestamp,
        preserveExistingApproval: keepApproved,
      }).catch(() => {});

      const updRes = await updateMotoristaSupabase(currentUser.email, {
        categoria: selectedCategory.title,
        placa: cleanPlate,
        modelo: cleanModel,
        ano: yearNum,
        cor: cleanColor,
        cnh: cleanCnh,
        cpf: cleanCpf,
        tipo: selectedCategory.userTipo,
        documentos_aceitos: true,
        aceitou_contrato: true,
        aceitou_termos: true,
        aceitou_lgpd: true,
        data_aceite: confirmedTimestamp,
      }).catch(() => ({ success: false, data: null }));

      if (!updRes.success || !updRes.data) {
        await saveUsuarioSupabase({
          nome: currentUser.name,
          email: currentUser.email,
          celular: currentUser.phone,
          whatsapp: currentUser.whatsapp || currentUser.phone,
          login: currentUser.login || currentUser.email,
          senha: '',
          tipo: selectedCategory.userTipo,
          categoria: selectedCategory.title,
          placa: cleanPlate,
          modelo: cleanModel,
          ano: yearNum,
          cnh: cleanCnh,
          foto: finalAvatarUrl,
          documentos_aceitos: true,
          aceitou_contrato: true,
          aceitou_termos: true,
          aceitou_lgpd: true,
          data_aceite: confirmedTimestamp,
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

        {/* Banner Lançamento RACE no topo da tela de escolha */}
        <LaunchPromoBanner />

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

          <div className="pt-1 flex flex-col gap-2">
            <button
              type="button"
              onClick={() => handleSelectCategory(initialKey)}
              className="w-full py-3.5 px-5 rounded-2xl bg-[#ff6a00] hover:bg-[#e05e00] active:scale-[0.99] text-white font-heading font-black text-sm sm:text-base flex items-center justify-center gap-2 cursor-pointer shadow-lg shadow-[#ff6a00]/25 transition-all"
            >
              <span>Completar cadastro para trabalhar</span>
              <ArrowRight className="w-4 h-4 shrink-0" />
            </button>

            {!hideLockedOnlineButton && (
              <button
                type="button"
                disabled
                className="w-full py-3 px-5 rounded-2xl bg-zinc-800 text-zinc-400 font-heading font-black text-xs sm:text-sm flex items-center justify-center gap-2 cursor-not-allowed border border-zinc-700"
              >
                <Lock className="w-4 h-4 shrink-0" />
                <span>Escolha sua categoria para ficar ONLINE</span>
              </button>
            )}
          </div>
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

  // ESTÁGIO 2: CADASTRO PASSO A PASSO (6 PASSOS OBRIGATÓRIOS — SEM PULAR)
  if (stage === 'fill_details') {
    const isCarCategory = selectedCategory.role === 'driver';
    const isDeliveryMoto = selectedCategory.key === 'motoboy_entregas';
    const all4CheckboxesMarked =
      acceptedContract && acceptedTerms && acceptedLgpd && acceptedPrivacy;

    const wizardSteps: Array<{
      step: 1 | 2 | 3 | 4 | 5 | 6;
      shortLabel: string;
      title: string;
      subtitle: string;
      done: boolean;
    }> = [
      {
        step: 1,
        shortLabel: '1. Perfil',
        title: 'Passo 1: Foto de perfil (rosto)',
        subtitle: 'Envie uma foto nítida do seu rosto, bem iluminada, sem óculos escuros ou boné.',
        done: Boolean(profilePhoto),
      },
      {
        step: 2,
        shortLabel: '2. CNH Frente',
        title: 'Passo 2: CNH Frente',
        subtitle: `Tire uma foto legível da frente da sua ${isCarCategory ? 'CNH B' : 'CNH A'} aberta.`,
        done: Boolean(cnhFrontPhoto),
      },
      {
        step: 3,
        shortLabel: '3. CNH Verso',
        title: 'Passo 3: CNH Verso',
        subtitle: 'Tire uma foto legível do verso da sua CNH com o QR Code visível.',
        done: Boolean(cnhBackPhoto),
      },
      {
        step: 4,
        shortLabel: '4. CRLV',
        title: `Passo 4: CRLV (documento ${isCarCategory ? 'do carro' : 'da moto'})`,
        subtitle: `Envie a foto do documento CRLV atualizado ${isCarCategory ? 'do seu carro' : 'da sua moto'}.`,
        done: Boolean(crlvPhoto),
      },
      {
        step: 5,
        shortLabel: isCarCategory ? '5. Carro (Frente)' : '5. Moto',
        title: isCarCategory
          ? 'Passo 5: Foto do carro (Frente)'
          : `Passo 5: ${selectedCategory.vehiclePhotoLabel}`,
        subtitle: isCarCategory
          ? 'Envie SÓ 1 foto da frente do carro (com a placa visível). Não precisa dos 4 lados.'
          : 'Envie 1 foto nítida da sua moto com a placa visível.',
        done: Boolean(vehiclePhoto),
      },
      {
        step: 6,
        shortLabel: '6. Dados',
        title: 'Passo 6: Dados do veículo, CPF e Chave PIX',
        subtitle: 'Preencha Modelo, Cor, Placa, Ano, CPF, Chave PIX e confirme os termos para enviar ao ADM.',
        done: Boolean(
          model.trim() &&
            color.trim() &&
            plate.trim() &&
            year.trim() &&
            cpf.trim() &&
            pixKey.trim() &&
            cnh.trim() &&
            all4CheckboxesMarked
        ),
      },
    ];

    const currentStepMeta = wizardSteps[wizardStep - 1];
    const progressPercent = Math.round((wizardStep / 6) * 100);

    const renderPhotoStepCard = (opts: {
      photoUrl: string;
      label: string;
      hint: string;
      isCircular?: boolean;
      onSelectFile: (file: File) => void;
    }) => (
      <div className="space-y-4">
        <label
          className={`flex flex-col items-center justify-center p-6 sm:p-8 border-2 border-dashed rounded-3xl cursor-pointer transition-all text-center gap-3 ${
            opts.photoUrl
              ? 'bg-emerald-50 border-emerald-500'
              : 'bg-slate-50 border-slate-300 hover:border-[#ff6a00] hover:bg-orange-50/40'
          }`}
        >
          <input
            type="file"
            accept="image/*"
            className="hidden"
            onChange={(e) => {
              const f = e.target.files?.[0];
              if (f) opts.onSelectFile(f);
            }}
          />
          {opts.photoUrl ? (
            <>
              <img
                src={opts.photoUrl}
                alt={opts.label}
                className={
                  opts.isCircular
                    ? 'w-40 h-40 rounded-full object-cover border-4 border-[#ff6a00] shadow-lg'
                    : 'w-full max-w-sm h-56 object-cover rounded-2xl border-2 border-emerald-500 shadow-md'
                }
              />
              <div className="flex items-center gap-2 text-emerald-700 font-heading font-black text-sm">
                <CheckCircle2 className="w-5 h-5" />
                <span>{opts.label} enviada ✓</span>
              </div>
              <span className="text-xs font-bold text-slate-600 underline">
                Toque para trocar a foto
              </span>
            </>
          ) : (
            <>
              <div className="w-16 h-16 rounded-2xl bg-[#ff6a00]/15 border border-[#ff6a00]/40 flex items-center justify-center">
                {opts.isCircular ? (
                  <User className="w-8 h-8 text-[#ff6a00]" />
                ) : (
                  <Camera className="w-8 h-8 text-[#ff6a00]" />
                )}
              </div>
              <div className="space-y-1">
                <span className="block text-base font-heading font-black text-slate-900">
                  Toque para enviar: {opts.label} *
                </span>
                <span className="block text-xs font-medium text-slate-600 max-w-md mx-auto">
                  {opts.hint}
                </span>
              </div>
              <span className="inline-flex items-center gap-1.5 px-4 py-2 rounded-xl bg-[#ff6a00] text-white font-heading font-black text-xs shadow-sm">
                <Camera className="w-4 h-4" />
                <span>Tirar foto ou escolher da galeria</span>
              </span>
            </>
          )}
        </label>

        <div className="flex items-center justify-between gap-3 pt-2">
          <button
            type="button"
            onClick={handlePrevWizardStep}
            className="px-5 py-3.5 rounded-2xl bg-slate-100 hover:bg-slate-200 text-slate-800 font-heading font-black text-sm flex items-center gap-1.5 cursor-pointer transition-all"
          >
            <ArrowLeft className="w-4 h-4" />
            <span>Voltar</span>
          </button>

          <button
            type="button"
            onClick={handleNextWizardStep}
            className={`flex-1 py-3.5 px-6 rounded-2xl font-heading font-black text-sm sm:text-base flex items-center justify-center gap-2 cursor-pointer transition-all shadow-md ${
              opts.photoUrl
                ? 'bg-[#ff6a00] hover:bg-[#e05e00] text-white active:scale-[0.99]'
                : 'bg-slate-900 hover:bg-slate-800 text-white'
            }`}
          >
            <span>Continuar para Passo {wizardStep + 1}</span>
            <ArrowRight className="w-4 h-4" />
          </button>
        </div>
      </div>
    );

    return (
      <div className="space-y-4 max-w-2xl mx-auto py-2 animate-fade-in">
        {/* Navegação e Modalidade Ativa */}
        <div className="flex items-center justify-between border-b border-zinc-800/40 pb-3">
          <button
            type="button"
            onClick={() => {
              if (isAppUserAdmin(currentUser)) {
                onOpenAdminPanel?.();
                return;
              }
              setStage('select_category');
            }}
            className="text-amber-400 hover:text-amber-300 text-xs font-bold transition-all cursor-pointer flex items-center gap-1.5 bg-zinc-900 px-3 py-2 rounded-xl border border-zinc-700"
          >
            <ArrowLeft className="w-4 h-4" />
            <span>Trocar modalidade</span>
          </button>
          <span className="text-xs font-mono font-black text-slate-950 bg-amber-400 px-3.5 py-1.5 rounded-full">
            {selectedCategory.title}
          </span>
        </div>

        {/* Banner de Reprovação (se ADM reprovou algum documento) */}
        {isRejectedResubmission && (
          <div className="bg-rose-50 border-2 border-rose-500 text-rose-950 rounded-2xl p-4 flex items-start gap-3 shadow-sm">
            <AlertTriangle className="w-5 h-5 text-rose-600 shrink-0 mt-0.5" />
            <div className="space-y-1 text-xs sm:text-sm">
              <strong className="font-heading font-black block">
                Documento reprovado pelo ADM
              </strong>
              <p className="font-bold">
                {rejectionMessage || 'Seu documento [CNH Frente] foi reprovado. Envie novamente.'}
              </p>
            </div>
          </div>
        )}

        {/* Indicador de Progresso Passo a Passo (1 a 6 — Sem pular) */}
        <div className="bg-white text-slate-900 border border-slate-200 rounded-3xl p-4 sm:p-5 shadow-md space-y-3">
          <div className="flex items-center justify-between gap-2">
            <div>
              <span className="text-[11px] font-mono font-black uppercase tracking-wider text-[#ff6a00] block">
                Passo {wizardStep} de 6 • Obrigatório na ordem
              </span>
              <h2 className="text-lg sm:text-xl font-heading font-black text-slate-950">
                {currentStepMeta.title}
              </h2>
            </div>
            <span className="text-xs font-mono font-black px-2.5 py-1 rounded-full bg-slate-950 text-white shrink-0">
              {progressPercent}%
            </span>
          </div>

          <div className="w-full h-2 bg-slate-200 rounded-full overflow-hidden">
            <div
              className="h-full bg-[#ff6a00] transition-all duration-300"
              style={{ width: `${progressPercent}%` }}
            />
          </div>

          <div className="grid grid-cols-3 sm:grid-cols-6 gap-1.5 pt-1">
            {wizardSteps.map((s) => {
              const isCurrent = s.step === wizardStep;
              return (
                <button
                  key={s.step}
                  type="button"
                  onClick={() => handleAttemptStepNavigation(s.step)}
                  className={`px-2 py-2 rounded-xl text-[11px] font-heading font-black border text-center transition-all cursor-pointer truncate ${
                    isCurrent
                      ? 'bg-[#ff6a00] text-white border-[#ff6a00] shadow-sm'
                      : s.done
                      ? 'bg-emerald-50 text-emerald-800 border-emerald-400'
                      : 'bg-slate-50 text-slate-500 border-slate-200 hover:border-slate-300'
                  }`}
                >
                  {s.done && !isCurrent ? `${s.shortLabel} ✓` : s.shortLabel}
                </button>
              );
            })}
          </div>

          <p className="text-xs sm:text-sm text-slate-600 font-medium">
            {currentStepMeta.subtitle}
          </p>
        </div>

        {/* Alerta em Tempo Real se Ano / Modelo / Baú não atenderem (Passo 6) */}
        {wizardStep === 6 && liveBlockingAlert && (
          <div className="bg-rose-50 border-2 border-rose-500 text-rose-950 text-xs sm:text-sm p-4 rounded-2xl font-bold space-y-2.5 shadow-md">
            <div className="flex items-start gap-2.5">
              <AlertTriangle className="w-5 h-5 text-rose-600 shrink-0 mt-0.5" />
              <span>{liveBlockingAlert}</span>
            </div>
            {selectedCategory.key === 'motorista_confort' && (
              <button
                type="button"
                onClick={() => {
                  if (isAppUserAdmin(currentUser)) {
                    onOpenAdminPanel?.();
                    return;
                  }
                  handleSelectCategory('motorista_economico');
                }}
                className="px-4 py-2 rounded-xl bg-slate-900 hover:bg-slate-800 text-white font-heading font-black text-xs cursor-pointer transition-all"
              >
                Mudar para Motorista Econômico
              </button>
            )}
          </div>
        )}

        {/* Mensagem de Erro / Bloqueio ao tentar pular passo */}
        {errorMessage && (
          <div className="bg-rose-50 border-2 border-rose-400 text-rose-900 text-xs sm:text-sm p-4 rounded-2xl font-bold flex items-center gap-2.5 shadow-sm">
            <AlertTriangle className="w-5 h-5 text-rose-600 shrink-0" />
            <span>{errorMessage}</span>
          </div>
        )}

        {/* CONTEÚDO DO PASSO ATUAL */}
        {wizardStep === 1 && (
          <div className="bg-white text-slate-900 border border-slate-200 p-5 sm:p-6 rounded-3xl shadow-xl">
            {renderPhotoStepCard({
              photoUrl: profilePhoto,
              label: 'Foto de perfil (rosto)',
              hint: 'Centralize seu rosto em local iluminado. Essa foto aparecerá para os passageiros e no ADM.',
              isCircular: true,
              onSelectFile: (file) => {
                setProfilePhotoFile(file);
                setErrorMessage(null);
                compressUploadImage(file, setProfilePhoto);
              },
            })}
          </div>
        )}

        {wizardStep === 2 && (
          <div className="bg-white text-slate-900 border border-slate-200 p-5 sm:p-6 rounded-3xl shadow-xl">
            {renderPhotoStepCard({
              photoUrl: cnhFrontPhoto,
              label: 'CNH Frente',
              hint: `Envie uma foto nítida da frente da sua ${isCarCategory ? 'CNH B' : 'CNH A'}, sem cortes e sem reflexo.`,
              onSelectFile: (file) => {
                setErrorMessage(null);
                compressUploadImage(file, setCnhFrontPhoto);
              },
            })}
          </div>
        )}

        {wizardStep === 3 && (
          <div className="bg-white text-slate-900 border border-slate-200 p-5 sm:p-6 rounded-3xl shadow-xl">
            {renderPhotoStepCard({
              photoUrl: cnhBackPhoto,
              label: 'CNH Verso',
              hint: 'Envie uma foto nítida do verso da sua CNH com todos os dados legíveis.',
              onSelectFile: (file) => {
                setErrorMessage(null);
                compressUploadImage(file, setCnhBackPhoto);
              },
            })}
          </div>
        )}

        {wizardStep === 4 && (
          <div className="bg-white text-slate-900 border border-slate-200 p-5 sm:p-6 rounded-3xl shadow-xl">
            {renderPhotoStepCard({
              photoUrl: crlvPhoto,
              label: `CRLV (documento ${isCarCategory ? 'do carro' : 'da moto'})`,
              hint: 'Envie foto ou print legível do CRLV (documento do veículo) em dia.',
              onSelectFile: (file) => {
                setErrorMessage(null);
                compressUploadImage(file, setCrlvPhoto);
              },
            })}
          </div>
        )}

        {wizardStep === 5 && (
          <div className="bg-white text-slate-900 border border-slate-200 p-5 sm:p-6 rounded-3xl shadow-xl">
            {renderPhotoStepCard({
              photoUrl: vehiclePhoto,
              label: isCarCategory ? 'Foto do carro (Frente)' : selectedCategory.vehiclePhotoLabel,
              hint: isCarCategory
                ? 'Apenas 1 foto da frente do carro mostrando a placa e o para-brisa. Não precisa tirar 4 lados.'
                : 'Apenas 1 foto nítida da moto mostrando a placa.',
              onSelectFile: (file) => {
                setErrorMessage(null);
                compressUploadImage(file, setVehiclePhoto);
              },
            })}
          </div>
        )}

        {wizardStep === 6 && (
          <form
            onSubmit={handleSubmitDetails}
            className="space-y-4 bg-white text-slate-900 border border-slate-200 p-5 sm:p-6 rounded-3xl shadow-xl"
          >
            {/* Resumo das 5 fotos já enviadas */}
            <div className="space-y-2">
              <span className="text-[11px] font-heading font-black text-emerald-700 uppercase tracking-wider block">
                5 fotos obrigatórias anexadas ✓ (toque para alterar)
              </span>
              <div className="grid grid-cols-5 gap-2">
                {[
                  { step: 1 as const, label: 'Perfil', src: profilePhoto },
                  { step: 2 as const, label: 'CNH Frente', src: cnhFrontPhoto },
                  { step: 3 as const, label: 'CNH Verso', src: cnhBackPhoto },
                  { step: 4 as const, label: 'CRLV', src: crlvPhoto },
                  { step: 5 as const, label: isCarCategory ? 'Carro' : 'Moto', src: vehiclePhoto },
                ].map((item) => (
                  <button
                    key={item.step}
                    type="button"
                    onClick={() => {
                      setErrorMessage(null);
                      setWizardStep(item.step);
                    }}
                    className="flex flex-col items-center gap-1 p-1.5 rounded-xl bg-emerald-50 border border-emerald-300 cursor-pointer hover:border-[#ff6a00]"
                  >
                    <img
                      src={item.src}
                      alt={item.label}
                      className="w-full h-12 object-cover rounded-lg"
                    />
                    <span className="text-[10px] font-bold text-emerald-800 truncate w-full text-center">
                      {item.label}
                    </span>
                  </button>
                ))}
              </div>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div className="space-y-1.5">
                <label className="text-xs font-bold text-slate-800 uppercase tracking-wider block">
                  {isCarCategory ? 'Modelo *' : 'Modelo moto *'}
                </label>
                <input
                  type="text"
                  required
                  value={model}
                  onChange={(e) => setModel(e.target.value)}
                  placeholder={selectedCategory.modelPlaceholder}
                  className="w-full bg-slate-50 border border-slate-300 rounded-xl px-4 py-3 text-sm font-medium text-slate-900 focus:outline-none focus:border-[#ff6a00]"
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
                  placeholder={isCarCategory ? 'Ex: Prata, Preto, Branco' : 'Ex: Preta, Vermelha, Azul'}
                  className="w-full bg-slate-50 border border-slate-300 rounded-xl px-4 py-3 text-sm font-medium text-slate-900 focus:outline-none focus:border-[#ff6a00]"
                />
              </div>

              <div className="space-y-1.5">
                <label className="text-xs font-bold text-slate-800 uppercase tracking-wider block">
                  {isCarCategory ? 'Placa *' : 'Placa moto *'}
                </label>
                <input
                  type="text"
                  required
                  value={plate}
                  onChange={(e) => setPlate(e.target.value.toUpperCase())}
                  placeholder={isCarCategory ? 'Ex: ABC1D23' : 'Ex: RCE9M22'}
                  maxLength={8}
                  className="w-full bg-slate-50 border border-slate-300 rounded-xl px-4 py-3 text-sm font-mono font-bold text-slate-900 focus:outline-none focus:border-[#ff6a00] uppercase"
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
                  placeholder={selectedCategory.defaultYear}
                  className={`w-full bg-slate-50 border rounded-xl px-4 py-3 text-sm font-medium text-slate-900 focus:outline-none ${
                    isYearBelowMinimum
                      ? 'border-rose-500 bg-rose-50 text-rose-900'
                      : 'border-slate-300 focus:border-[#ff6a00]'
                  }`}
                />
                <span className="text-[11px] font-bold text-slate-500 block">
                  Exigência mínima: ano {selectedCategory.minYear} ou superior.
                </span>
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
                  className="w-full bg-slate-50 border border-slate-300 rounded-xl px-4 py-3 text-sm font-mono font-medium text-slate-900 focus:outline-none focus:border-[#ff6a00]"
                />
              </div>

              <div className="space-y-1.5">
                <label className="text-xs font-bold text-slate-800 uppercase tracking-wider block">
                  Chave PIX *
                </label>
                <input
                  type="text"
                  required
                  value={pixKey}
                  onChange={(e) => setPixKey(e.target.value)}
                  placeholder="CPF, celular, e-mail ou chave aleatória"
                  className="w-full bg-slate-50 border border-slate-300 rounded-xl px-4 py-3 text-sm font-mono font-medium text-slate-900 focus:outline-none focus:border-[#ff6a00]"
                />
              </div>

              <div className="space-y-1.5 sm:col-span-2">
                <label className="text-xs font-bold text-slate-800 uppercase tracking-wider block">
                  {isCarCategory ? 'Número da CNH B *' : 'Número da CNH A *'}
                </label>
                <input
                  type="text"
                  required
                  value={cnh}
                  onChange={(e) => setCnh(e.target.value)}
                  placeholder={isCarCategory ? 'Número da CNH B válida' : 'Número da CNH A válida'}
                  className="w-full bg-slate-50 border border-slate-300 rounded-xl px-4 py-3 text-sm font-mono font-medium text-slate-900 focus:outline-none focus:border-[#ff6a00]"
                />
              </div>

              {!isCarCategory && (
                <>
                  <div className="space-y-1.5">
                    <label className="text-xs font-bold text-slate-800 uppercase tracking-wider block">
                      Tem baú? *
                    </label>
                    <select
                      value={hasTrunk}
                      onChange={(e) => setHasTrunk(e.target.value as 'Sim' | 'Não')}
                      className="w-full bg-slate-50 border border-slate-300 rounded-xl px-4 py-3 text-sm font-bold text-slate-900 focus:outline-none focus:border-[#ff6a00] cursor-pointer"
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
                        className="w-full bg-slate-50 border border-slate-300 rounded-xl px-4 py-3 text-sm font-medium text-slate-900 focus:outline-none focus:border-[#ff6a00] cursor-pointer"
                      >
                        <option value="Baú 90 Litros">Baú 90 Litros (Mínimo Entregas)</option>
                        <option value="Baú 100 Litros">Baú 100 Litros</option>
                        <option value="Baú 120 Litros">Baú 120 Litros</option>
                        <option value="Baú 135 Litros">Baú 135 Litros</option>
                      </select>
                    </div>
                  )}
                </>
              )}
            </div>

            {/* 4 CHECKBOXES OBRIGATÓRIOS: 1) CONTRATO, 2) TERMOS, 3) LGPD, 4) POLÍTICA DE PRIVACIDADE */}
            <LegalConsentSection
              acceptedContract={acceptedContract}
              acceptedTerms={acceptedTerms}
              acceptedLgpd={acceptedLgpd}
              acceptedPrivacy={acceptedPrivacy}
              onChangeContract={setAcceptedContract}
              onChangeTerms={setAcceptedTerms}
              onChangeLgpd={setAcceptedLgpd}
              onChangePrivacy={setAcceptedPrivacy}
              onOpenPrivacyPage={onOpenPrivacyPage}
              theme="light"
            />

            <div className="flex items-center gap-3">
              <button
                type="button"
                onClick={handlePrevWizardStep}
                className="px-5 py-4 rounded-2xl bg-slate-100 hover:bg-slate-200 text-slate-800 font-heading font-black text-sm flex items-center gap-1.5 cursor-pointer shrink-0"
              >
                <ArrowLeft className="w-4 h-4" />
                <span>Voltar</span>
              </button>

              <button
                type="submit"
                disabled={isSaving || Boolean(liveBlockingAlert)}
                className={`flex-1 py-4 px-6 rounded-2xl font-heading font-black text-sm sm:text-base transition-all shadow-lg flex items-center justify-center gap-2 ${
                  isSaving || Boolean(liveBlockingAlert)
                    ? 'bg-slate-300 text-slate-600 border-2 border-slate-400 cursor-not-allowed opacity-85'
                    : !all4CheckboxesMarked
                    ? 'bg-amber-100 hover:bg-amber-200 text-amber-950 border-2 border-amber-500 cursor-pointer'
                    : 'bg-emerald-600 hover:bg-emerald-500 text-white cursor-pointer active:scale-[0.99]'
                }`}
              >
                {isSaving ? (
                  <>
                    <Loader2 className="w-5 h-5 animate-spin" />
                    <span>Enviando cadastro...</span>
                  </>
                ) : !all4CheckboxesMarked ? (
                  <>
                    <Lock className="w-5 h-5" />
                    <span>Marque os 4 documentos para enviar</span>
                  </>
                ) : (
                  <>
                    <CheckCircle2 className="w-5 h-5" />
                    <span>
                      {currentUser.driverData?.approvalStatus === 'aprovado'
                        ? 'Salvar alterações do veículo'
                        : 'Enviar cadastro para aprovação do ADM'}
                    </span>
                  </>
                )}
              </button>
            </div>
          </form>
        )}
      </div>
    );
  }

  return null;
};
