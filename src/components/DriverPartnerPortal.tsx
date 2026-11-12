import React, { useState, useRef, useEffect } from 'react';
import { Driver, Ride, VehicleCategory, PendingPayment, AppUser, UserRole, UserTipo } from '../types';
import { formatBRL, WEEKLY_SUBSCRIPTION_PRICE } from '../services/pricingService';
import { saveUserAccount, verifyUserLogin, getUserAccount } from '../services/userService';
import { savePagamentoSupabase } from '../supabase';
import { 
  WEEKLY_FEE, 
  WEEKLY_FEE_TEXT, 
  WEEKLY_FEE_SHORT, 
  WEEKLY_FEE_BADGE, 
  WEEKLY_DAYS, 
  ECONOMY_VS_UBER_PERCENT, 
  COMMISSION,
  RACE_PIX_KEY,
  RACE_PIX_KEY_TYPE,
  RACE_PIX_BANK,
  RACE_PIX_NAME
} from '../config/pricing';
import { 
  validateComfortEligibility, 
  COMFORT_POPULAR_MODELS, 
  ComfortValidationResult 
} from '../services/vehicleValidationService';

interface CategoryGuideInfo {
  id: VehicleCategory;
  title: string;
  tagline: string;
  badge: string;
  badgeColor: string;
  pricePerKm: string;
  earningsDescription: string;
  activitiesList: string[];
  driverRequirements: string[];
  vehicleRequirements: string[];
  mandatoryEquipment: string[];
}

const CATEGORY_GUIDES: Record<VehicleCategory, CategoryGuideInfo> = {
  economica: {
    id: 'economica',
    title: 'Motorista Econômico',
    tagline: 'Transporte de passageiros em carro de passeio 4 portas',
    badge: 'R$ 2,50/km • 100% dos Ganhos Livres',
    badgeColor: 'bg-zinc-800 text-zinc-200 border-zinc-700',
    pricePerKm: 'R$ 2,50',
    earningsDescription: '100% de todo valor pago pelo passageiro vai direto para você. Zero comissão retida (0% vs 25% a 40% da Uber/99).',
    activitiesList: [
      'Atendimento a chamados diários no Centro, bairros e condomínios de Indaiatuba.',
      'Transporte individual ou familiar de passageiros (trabalho, compras, compromissos).',
      'Liberdade total para definir seus horários de início e parada sem metas obrigatórias.',
      'Recebimento imediato direto na sua conta bancária via PIX ou em dinheiro.',
    ],
    driverRequirements: [
      'CNH Definitiva Categoria B com anotação EAR ("Exerce Atividade Remunerada").',
      'Idade mínima de 21 anos completos.',
      'Atestado de Antecedentes Criminais sem restrições.',
      'Comprovante de residência em Indaiatuba ou cidades vizinhas.',
    ],
    vehicleRequirements: [
      'Veículo de passeio 4 portas com ar-condicionado em pleno funcionamento.',
      'Capacidade legal para 5 ocupantes (motorista + 4 passageiros).',
      'Ano de fabricação a partir de 2012 em bom estado de conservação mecânica e visual.',
      'Documento do veículo (CRLV) devidamente licenciado e regular.',
    ],
    mandatoryEquipment: [
      'Suporte automotivo firme e articulado para celular no painel ou para-brisa.',
      'Carregador veicular rápido com cabos USB-C e Lightning.',
      'Ar-condicionado sempre pronto e limpo para acionamento a pedido do passageiro.',
      'Pneus em ótimo estado de segurança (acima do limite TWI) e estepe operacional.',
    ],
  },
  confort: {
    id: 'confort',
    title: 'Motorista Confort',
    tagline: 'Corridas premium em Sedãs Médios, Compactos Novos e SUVs',
    badge: 'R$ 3,50/km • Alta Rentabilidade',
    badgeColor: 'bg-[#ff6a00]/20 text-[#ff6a00] border-[#ff6a00]/40',
    pricePerKm: 'R$ 3,50',
    earningsDescription: 'Tarifa valorizada de R$ 3,50/km com 100% dos ganhos livres para o condutor. Fature até 40% a mais por km rodado com menor desgaste.',
    activitiesList: [
      'Atendimento executivo em Indaiatuba, transfer para Viracopos, hotéis e centro empresarial.',
      'Corridas nos condomínios de alto padrão de Indaiatuba (Helvetia, Parque Suíça, Mosteiro de Itaici, etc.).',
      'Passageiros que prezam por silêncio, ar-condicionado constante, espaço e pontualidade.',
      'Viagens mais longas e ticket médio significativamente maior.',
    ],
    driverRequirements: [
      'CNH Categoria B definitiva com anotação EAR ativa.',
      'Postura executiva, pontualidade britânica e atendimento cortês.',
      'Nota mínima de avaliação 4.85 estrelas no histórico de atendimento.',
      'Certidão negativa de antecedentes criminais atualizada.',
    ],
    vehicleRequirements: [
      'Sedãs Médios e SUVs (Corolla, Civic, HR-V, Compass, Tracker, T-Cross, Renegade) ano 2018+.',
      'Sedãs Populares Novos (Voyage, Cronos, Onix Plus, Virtus, Etios) ano 2019+.',
      'Compactos Premium Novos (Polo, Argo) ano 2023+.',
      'Regra geral: ano de fabricação 2020 ou superior para aprovação imediata.',
      'Porta-malas sempre limpo e 100% desocupado para malas e bagagens.',
    ],
    mandatoryEquipment: [
      'Ar-condicionado obrigatoriamente ligado e refrigerando em todas as corridas.',
      'Suporte profissional de celular com carregamento por indução ou cabo turbo.',
      'Veículo impecável: estofamento higienizado, sem odores e lataria polida.',
      'Água mineral e balas lacradas cortesia (diferencial altamente recomendado).',
    ],
  },
  moto_passageiro: {
    id: 'moto_passageiro',
    title: 'Motoboy Passageiro (Moto Táxi)',
    tagline: 'Transporte individual ágil de passageiros em motocicleta 150cc+',
    badge: 'R$ 1,80/km • Velocidade no Trânsito',
    badgeColor: 'bg-cyan-100 text-cyan-900 border-cyan-300',
    pricePerKm: 'R$ 1,80',
    earningsDescription: '100% dos ganhos livres para o motociclista. Com baixíssimo consumo de combustível (40 a 50 km/L), sua margem líquida diária é excelente!',
    activitiesList: [
      'Transporte individual ágil de passageiros que precisam chegar rápido ao destino.',
      'Agilidade no trânsito de Indaiatuba nos horários de pico (7h-9h e 17h-19h).',
      'Corridas curtas e médias com embarque e desembarque imediato sem dificuldade de vaga.',
      'Sem repasse de porcentagem: todo valor da corrida é recebido integralmente por você.',
    ],
    driverRequirements: [
      'CNH Definitiva Categoria A com anotação EAR ("Exerce Atividade Remunerada").',
      'Idade mínima de 21 anos.',
      'Prática de pilotagem defensiva e histórico responsável de trânsito.',
      'Atestado de Antecedentes Criminais sem anotações judiciais.',
    ],
    vehicleRequirements: [
      'Motocicleta com motor a partir de 150cc em perfeitas condições mecânicas.',
      'Pneus dianteiro e traseiro novos ou com boa profundidade de borracha.',
      'Freios regulados, farol, lanterna de freio, setas e buzina 100% funcionando.',
      'CRLV da motocicleta regularizado e licenciado.',
      'Escapamento regulamentar de acordo com as normas de ruído do Detran/Contran.',
    ],
    mandatoryEquipment: [
      '2 Capacetes certificados pelo INMETRO com selo e adesivos refletivos (1 para você e 1 exclusivo para o passageiro com fita jugular e viseira cristal limpa).',
      'Kit de toucas higiênicas descartáveis para fornecer a todo e qualquer passageiro.',
      'Colete ou jaqueta com faixas retrorrefletivas de segurança para alta visibilidade.',
      'Suporte de guidão firme e impermeável com trava anti-queda para celular.',
    ],
  },
  moto_entrega: {
    id: 'moto_entrega',
    title: 'Motoboy Entregas (Flash & Delivery)',
    tagline: 'Entrega expressa de mercadorias, pacotes e encomendas até 20kg',
    badge: 'R$ 2,00/km • Encomendas Flash',
    badgeColor: 'bg-amber-100 text-amber-900 border-amber-300',
    pricePerKm: 'R$ 2,00',
    earningsDescription: '100% do frete de entrega vai direto para seu bolso. Assinatura semanal fixa de R$ 200, sem comissão por pacote entregue.',
    activitiesList: [
      'Coleta e entrega expressa ponto a ponto de pacotes, documentos, peças e compras em Indaiatuba.',
      'Atendimento a farmácias, autopeças, escritórios, e-commerce e comércio local.',
      'Sem transporte de passageiros: foco total na integridade da encomenda e rota otimizada.',
      'Confirmação de entrega segura com código de 4 dígitos digitado pelo destinatário.',
    ],
    driverRequirements: [
      'CNH Categoria A definitiva com anotação EAR ("Exerce Atividade Remunerada").',
      'Pontualidade na coleta e zelo absoluto com embalagens e produtos frágeis.',
      'Atestado de Antecedentes Criminais limpo.',
      'Conhecimento das ruas, avenidas e zonas comerciais de Indaiatuba.',
    ],
    vehicleRequirements: [
      'Motocicleta de 125cc a 300cc em dia com a documentação (CRLV).',
      'Suporte metálico traseiro reforçado para baú ou fixação segura de mochila/bag.',
      'Pneus e sistema de freios preparados para tráfego contínuo com carga até 20kg.',
    ],
    mandatoryEquipment: [
      'Baú homologado (80L, 90L ou 120L) com tranca/cadeado OU Mochila Bag Térmica impermeável para até 20kg.',
      'Capa de chuva completa impermeável e polainas para operação em tempo chuvoso.',
      'Rede elástica interna para estabilizar encomendas menores dentro do baú.',
      'Capacete INMETRO com viseira cristal transparente e adesivos refletivos.',
    ],
  },
};

const CATEGORY_PRESETS: Record<VehicleCategory, { name: string; year: string; highlight?: string }[]> = {
  economica: [
    { name: 'Chevrolet Onix', year: '2021', highlight: 'Econômico' },
    { name: 'Fiat Argo', year: '2022', highlight: 'Econômico' },
    { name: 'Hyundai HB20', year: '2020', highlight: 'Econômico' },
    { name: 'Renault Kwid', year: '2021', highlight: 'Compacto' },
    { name: 'VW Gol 1.0', year: '2019', highlight: 'Popular' },
    { name: 'Ford Ka 1.0', year: '2018', highlight: 'Popular' },
  ],
  confort: [
    { name: 'Toyota Corolla Sedã', year: '2023', highlight: 'Sedã Médio 2018+' },
    { name: 'Honda Civic Sedã', year: '2022', highlight: 'Sedã Médio 2018+' },
    { name: 'Jeep Compass', year: '2023', highlight: 'SUV Médio 2018+' },
    { name: 'VW T-Cross', year: '2022', highlight: 'SUV Compacto 2018+' },
    { name: 'Honda HR-V', year: '2021', highlight: 'SUV 2018+' },
    { name: 'VW Voyage', year: '2020', highlight: 'Sedã Popular 2019+' },
    { name: 'Fiat Cronos', year: '2021', highlight: 'Sedã Popular 2019+' },
    { name: 'VW Polo TSI', year: '2023', highlight: 'Premium 2023+' },
  ],
  moto_passageiro: [
    { name: 'Honda CG 160 Titan', year: '2022', highlight: '160cc Mais Usada' },
    { name: 'Yamaha Fazer 250', year: '2023', highlight: '250cc Conforto' },
    { name: 'Honda NXR 160 Bros', year: '2021', highlight: 'Trail Conforto' },
    { name: 'Yamaha Factor 150', year: '2022', highlight: '150cc Econômica' },
    { name: 'Honda CB 300F Twister', year: '2023', highlight: 'Potência' },
  ],
  moto_entrega: [
    { name: 'Honda CG 160 Start', year: '2022', highlight: 'Ideal para Baú' },
    { name: 'Honda Biz 125', year: '2021', highlight: 'Praticidade Carga' },
    { name: 'Yamaha Factor 150', year: '2022', highlight: 'Econômica' },
    { name: 'Honda NXR 160 Bros', year: '2020', highlight: 'Reforçada' },
    { name: 'Honda Pop 110i', year: '2022', highlight: 'Baú 80L' },
  ],
};
import { 
  UserCheck, 
  ShieldCheck, 
  DollarSign, 
  Zap, 
  CheckCircle2, 
  Car, 
  Bike, 
  Package,
  Power, 
  CreditCard, 
  QrCode, 
  TrendingUp, 
  Headphones, 
  Lock, 
  Eye, 
  EyeOff, 
  LogIn, 
  AlertTriangle, 
  Info, 
  Sparkles,
  HelpCircle,
  Share2,
  ArrowRight,
  Copy,
  Check,
  Clock,
  Wallet,
  Loader2,
  X,
  Upload,
  FileCheck,
  Building2,
  UserCheck2,
  CheckCircle,
  Navigation,
  Camera,
  MapPin,
  Phone,
  ArrowDownCircle,
  XCircle
} from 'lucide-react';
import confetti from 'canvas-confetti';
import { DriverGpsNavigationModal } from './DriverGpsNavigationModal';
import { 
  getDriverBalance, 
  calculateWalletSummary, 
  requestWithdrawal, 
  getWithdrawals, 
  checkMondayAutoDeduction 
} from '../services/walletService';
import { getDriverRatingStats } from '../services/reviewService';
import { WithdrawalRequest } from '../types';

interface DriverPartnerPortalProps {
  currentDriver: Driver;
  currentUser?: AppUser | null;
  rides?: Ride[];
  activeRide?: Ride | null;
  onUpdateDriver: (driver: Driver) => void;
  onRegisterDriver: (newDriver: Driver) => void;
  onLoginDriverSuccess?: (user: AppUser, driver?: Driver) => void;
  onAcceptIncomingRide?: (ride: Ride) => void;
  onOpenSupport: () => void;
  onOpenShare?: () => void;
  onNavigateToRides?: () => void;
  onShowSubscriptionExpiredModal?: () => void;
  onRenewWeeklyPlan?: (driver?: Driver) => void;
  onTriggerToast?: (title: string, message: string, type?: 'ride' | 'financial' | 'safety' | 'system') => void;
}

export const DriverPartnerPortal: React.FC<DriverPartnerPortalProps> = ({
  currentDriver,
  currentUser,
  rides = [],
  activeRide,
  onUpdateDriver,
  onRegisterDriver,
  onLoginDriverSuccess,
  onAcceptIncomingRide,
  onOpenSupport,
  onOpenShare,
  onNavigateToRides,
  onShowSubscriptionExpiredModal,
  onRenewWeeklyPlan,
  onTriggerToast,
}) => {
  const [activeSubTab, setActiveSubTab] = useState<'dashboard' | 'login' | 'register' | 'subscription'>(() => {
    return currentDriver.weeklyPlanActive ? 'dashboard' : 'subscription';
  });
  const [dashboardSection, setDashboardSection] = useState<'corridas' | 'ganhos' | 'assinatura' | 'perfil'>('corridas');
  const [isOnline, setIsOnline] = useState(currentDriver.status === 'online');
  const [acceptedRideNotice, setAcceptedRideNotice] = useState<string | null>(null);
  const [comfortWarning, setComfortWarning] = useState<string | null>(null);
  const [isDriverGpsOpen, setIsDriverGpsOpen] = useState(false);

  // Galeria de Fotos: Perfil, CNH e Foto do Veículo
  const driverAvatarInputRef = useRef<HTMLInputElement>(null);
  const cnhDocInputRef = useRef<HTMLInputElement>(null);
  const vehicleDocInputRef = useRef<HTMLInputElement>(null);

  const [cnhDocPreview, setCnhDocPreview] = useState<string | null>(null);
  const [vehicleDocPreview, setVehicleDocPreview] = useState<string | null>(null);

  const handleDriverAvatarUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    const reader = new FileReader();
    reader.onload = (event) => {
      const base64 = event.target?.result as string;
      if (base64) {
        const updated: Driver = {
          ...currentDriver,
          avatar: base64,
        };
        onUpdateDriver(updated);

        if (currentUser && currentUser.email) {
          const userAcc = getUserAccount(currentUser.email);
          if (userAcc) {
            saveUserAccount({
              ...userAcc,
              avatar: base64,
              driverData: updated,
            }, true);
          }
        }
      }
    };
    reader.readAsDataURL(file);
  };

  const handleCnhDocUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    const reader = new FileReader();
    reader.onload = (event) => {
      const base64 = event.target?.result as string;
      if (base64) setCnhDocPreview(base64);
    };
    reader.readAsDataURL(file);
  };

  const handleVehicleDocUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    const reader = new FileReader();
    reader.onload = (event) => {
      const base64 = event.target?.result as string;
      if (base64) setVehicleDocPreview(base64);
    };
    reader.readAsDataURL(file);
  };

  // Driver's own PIX key where they receive 100% of ride earnings
  const [driverPixKey, setDriverPixKey] = useState<string>(
    currentDriver.pixKey || currentDriver.cpf || ''
  );
  const [savedDriverPixNotice, setSavedDriverPixNotice] = useState(false);

  // Carteira e Saques (Meu Saldo com desconto automático da semana)
  const [walletPixKey, setWalletPixKey] = useState<string>(
    currentDriver.pixKey || currentDriver.cpf || ''
  );
  const [withdrawalSuccessMessage, setWithdrawalSuccessMessage] = useState<string | null>(null);
  const [withdrawalErrorMessage, setWithdrawalErrorMessage] = useState<string | null>(null);
  const [driverWithdrawals, setDriverWithdrawals] = useState<WithdrawalRequest[]>(() => {
    return getWithdrawals().filter((w) => w.driverId === currentDriver.id);
  });
  const [isCopiedAdminPix, setIsCopiedAdminPix] = useState(false);

  // Executa auto-dedução na segunda-feira se aplicável
  useEffect(() => {
    if (currentDriver && currentDriver.id) {
      const res = checkMondayAutoDeduction(currentDriver);
      if (res.deducted) {
        onUpdateDriver({
          ...currentDriver,
          walletBalance: res.newBalance,
          weeklyPlanActive: true,
        });
        if (onTriggerToast && res.message) {
          onTriggerToast('Assinatura Semanal', res.message, 'financial');
        }
      }
    }
  }, [currentDriver?.id]);

  const walletSummary = calculateWalletSummary(currentDriver);
  const ratingStats = getDriverRatingStats(currentDriver?.id, currentDriver?.rating || 4.8, currentDriver?.totalRides || 25);

  const handleRequestWithdrawalAction = (summary: ReturnType<typeof calculateWalletSummary>) => {
    setWithdrawalErrorMessage(null);
    setWithdrawalSuccessMessage(null);

    if (!walletPixKey || !walletPixKey.trim()) {
      setWithdrawalErrorMessage('Por favor, informe sua chave PIX para receber a transferência.');
      return;
    }

    const res = requestWithdrawal(currentDriver, walletPixKey);
    if (!res.success) {
      setWithdrawalErrorMessage(res.error || 'Não foi possível solicitar o saque.');
      return;
    }

    setWithdrawalSuccessMessage(
      `Saque de ${formatBRL(res.withdrawal!.netAmount)} solicitado - Admin vai enviar em até 24h`
    );
    setDriverWithdrawals(getWithdrawals().filter((w) => w.driverId === currentDriver.id));

    // Atualiza o motorista com o novo saldo e chave PIX
    const updated: Driver = {
      ...currentDriver,
      walletBalance: 0,
      pixKey: walletPixKey.trim(),
      weeklyPlanActive: true,
    };
    onUpdateDriver(updated);
    if (onTriggerToast) {
      onTriggerToast(
        '💰 Saque Solicitado',
        `Saque de ${formatBRL(res.withdrawal!.netAmount)} solicitado - Admin vai enviar em até 24h`,
        'financial'
      );
    }
  };

  // Real Manual PIX Modal & Comprovante state for R$ 200 Weekly Plan
  const [isPixModalOpen, setIsPixModalOpen] = useState(false);
  const [copiedRacePix, setCopiedRacePix] = useState(false);
  const [comprovanteId, setComprovanteId] = useState('');
  const [comprovanteImage, setComprovanteImage] = useState<string | null>(null);
  const [comprovanteFileName, setComprovanteFileName] = useState('');
  const [isSubmittingProof, setIsSubmittingProof] = useState(false);
  const [proofSentSuccessNotice, setProofSentSuccessNotice] = useState<string | null>(null);

  // Login form state
  const [loginEmail, setLoginEmail] = useState('');
  const [loginPassword, setLoginPassword] = useState('');
  const [showLoginPassword, setShowLoginPassword] = useState(false);
  const [loginFeedback, setLoginFeedback] = useState<string | null>(null);
  const [loginSuccessNotice, setLoginSuccessNotice] = useState<string | null>(null);

  // Registration form state
  const [regName, setRegName] = useState('');
  const [regPhone, setRegPhone] = useState('');
  const [regEmail, setRegEmail] = useState('');
  const [regPassword, setRegPassword] = useState('');
  const [regConfirmPassword, setRegConfirmPassword] = useState('');
  const [showRegPassword, setShowRegPassword] = useState(false);
  const [regCpf, setRegCpf] = useState('');
  const [regCnh, setRegCnh] = useState('');
  const [regCategory, setRegCategory] = useState<VehicleCategory>('economica');
  const [regModel, setRegModel] = useState('Chevrolet Onix');
  const [regPlate, setRegPlate] = useState('RCE9C40');
  const [regYear, setRegYear] = useState('2021');
  const [regColor, setRegColor] = useState('Prata');
  const [regPixKey, setRegPixKey] = useState('');
  const [regTrunkType, setRegTrunkType] = useState('Baú 80 Litros');
  const [regHelmetConfirmed, setRegHelmetConfirmed] = useState(true);
  const [regAcConfirmed, setRegAcConfirmed] = useState(true);
  const [regError, setRegError] = useState<string | null>(null);
  const [registeredSuccess, setRegisteredSuccess] = useState(false);

  const handleCategoryChange = (newCat: VehicleCategory) => {
    setRegCategory(newCat);
    setRegError(null);
    setComfortWarning(null);
    // Auto-fill default vehicle for that category if using another category's default
    const presets = CATEGORY_PRESETS[newCat];
    if (presets && presets.length > 0) {
      setRegModel(presets[0].name);
      setRegYear(presets[0].year);
    }
  };

  // Live evaluation of Confort eligibility
  const comfortCheck: ComfortValidationResult = validateComfortEligibility(
    regModel,
    parseInt(regYear, 10) || 0
  );

  const isSubscriptionExpired = () => {
    if (!currentDriver.weeklyPlanActive) return true;
    const expiresDate = currentDriver.weeklyFeeExpiresAt
      ? new Date(currentDriver.weeklyFeeExpiresAt)
      : currentDriver.weeklyPlanExpiresAt
      ? new Date(currentDriver.weeklyPlanExpiresAt)
      : null;
    return expiresDate ? expiresDate < new Date() : false;
  };

  // Status da assinatura: Ativa até DD/MM/YYYY HH:mm ou Vencida em DD/MM
  const getSubscriptionDetails = () => {
    const expiresStr = currentDriver.weeklyFeeExpiresAt || currentDriver.weeklyPlanExpiresAt;
    const now = new Date();

    if (!currentDriver.weeklyPlanActive || !expiresStr) {
      return {
        isActive: false,
        badgeLabel: 'VENCIDO',
        textLabel: 'Vencida',
        progressPercent: 0,
        daysLeft: 0,
      };
    }

    const expiresDate = new Date(expiresStr);
    if (isNaN(expiresDate.getTime()) || expiresDate.getTime() <= now.getTime()) {
      const day = !isNaN(expiresDate.getTime()) ? String(expiresDate.getDate()).padStart(2, '0') : '';
      const month = !isNaN(expiresDate.getTime()) ? String(expiresDate.getMonth() + 1).padStart(2, '0') : '';
      const label = day && month ? `Vencido em ${day}/${month}` : 'Vencida';
      return {
        isActive: false,
        badgeLabel: 'VENCIDO',
        textLabel: label,
        progressPercent: 0,
        daysLeft: 0,
      };
    }

    const day = String(expiresDate.getDate()).padStart(2, '0');
    const month = String(expiresDate.getMonth() + 1).padStart(2, '0');
    const year = expiresDate.getFullYear();
    const hours = String(expiresDate.getHours()).padStart(2, '0');
    const minutes = String(expiresDate.getMinutes()).padStart(2, '0');
    const activeText = `Ativo até ${day}/${month}/${year} ${hours}:${minutes}`;

    const totalDurationMs = WEEKLY_DAYS * 24 * 60 * 60 * 1000;
    const timeLeftMs = Math.max(0, expiresDate.getTime() - now.getTime());
    const daysLeft = Math.ceil(timeLeftMs / (24 * 60 * 60 * 1000));
    const progressPercent = Math.min(100, Math.max(8, (timeLeftMs / totalDurationMs) * 100));

    return {
      isActive: true,
      badgeLabel: 'PLANO ATIVO',
      textLabel: activeText,
      progressPercent,
      daysLeft,
    };
  };

  const subDetails = getSubscriptionDetails();
  const subStatus = { isActive: subDetails.isActive, label: subDetails.textLabel };

  // Economia vs Uber/99 (comissão média de ~28%)
  const weeklyEarnings = currentDriver.earningsWeek || 0;
  const uberCut = Math.round(weeklyEarnings * 0.28);
  const raceFee = WEEKLY_FEE;
  const driverSavingsVsUber99 = Math.max(0, uberCut - raceFee);

  const toggleOnline = () => {
    if (!isOnline && isSubscriptionExpired()) {
      if (onShowSubscriptionExpiredModal) {
        onShowSubscriptionExpiredModal();
      } else {
        setActiveSubTab('subscription');
      }
      return;
    }
    const nextStatus = !isOnline;
    setIsOnline(nextStatus);
    onUpdateDriver({
      ...currentDriver,
      status: nextStatus ? 'online' : 'offline',
    });
  };

  const handleLoginSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!loginEmail || !loginPassword) {
      setLoginFeedback('Por favor, informe seu login (e-mail) e sua senha.');
      return;
    }

    const verification = verifyUserLogin(loginEmail, loginPassword);
    if (!verification.success || !verification.user) {
      setLoginFeedback(verification.error || 'E-mail ou senha incorretos.');
      return;
    }

    setLoginFeedback(null);
    setLoginSuccessNotice(null);
    const loggedUser = verification.user;

    if (onLoginDriverSuccess) {
      onLoginDriverSuccess(loggedUser, verification.driver || loggedUser.driverData || currentDriver);
    }

    if (verification.driver) {
      onUpdateDriver(verification.driver);
    } else if (loggedUser.driverData) {
      onUpdateDriver(loggedUser.driverData);
    } else {
      onUpdateDriver({
        ...currentDriver,
        email: loggedUser.email,
        name: loggedUser.name,
        phone: loggedUser.phone,
        status: 'online',
      });
    }

    setIsOnline(true);
    setActiveSubTab('dashboard');

    try {
      confetti({ particleCount: 40, spread: 60, origin: { y: 0.6 } });
    } catch {
      // safe
    }

    // Direct transition to ride attendance page
    if (onNavigateToRides) {
      setTimeout(() => {
        onNavigateToRides();
      }, 400);
    }
  };

  const handleSelectPresetModel = (model: { name: string; year?: string; minYear?: number }) => {
    setRegModel(model.name);
    if (model.year) {
      setRegYear(model.year);
    } else if (model.minYear) {
      setRegYear(model.minYear.toString());
    }
  };

  const handleRegisterSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    setRegError(null);
    setComfortWarning(null);

    if (!regName || !regPhone || !regCpf || !regModel || !regPlate || !regEmail || !regPassword) {
      setRegError('Por favor, preencha todos os campos obrigatórios (*).');
      return;
    }

    if (regPassword.length < 6) {
      setRegError('A senha deve conter no mínimo 6 dígitos para sua segurança.');
      return;
    }

    if (regPassword !== regConfirmPassword) {
      setRegError('A confirmação de senha não confere com a senha digitada.');
      return;
    }

    if (regCategory === 'moto_passageiro' && !regHelmetConfirmed) {
      setRegError('Para exercer a atividade de Moto Táxi, é obrigatório possuir 2 capacetes INMETRO e fornecer toucas higiênicas.');
      return;
    }

    const yearNum = parseInt(regYear, 10) || 2023;
    let finalCategory = regCategory;
    let comfortEligible = false;
    let reason = '';

    // Rigorous Comfort Validation
    if (regCategory === 'confort') {
      const check = validateComfortEligibility(regModel, yearNum);
      if (!check.eligible) {
        // Did not meet year requirement for Confort!
        finalCategory = 'economica';
        comfortEligible = false;
        reason = `Não atende exigência de ano Confort: ${check.ruleDescription}. Homologado em RACE Econômica.`;
        setComfortWarning(
          `Aviso Confort: Seu veículo (${regModel} ano ${yearNum}) não atende à exigência mínima do modelo Confort (${check.ruleDescription}). Seu cadastro foi automaticamente homologado na categoria RACE Econômica (R$ 2,50/km) com 100% dos ganhos livres!`
        );
      } else {
        comfortEligible = true;
        reason = `Aprovado para Confort: atende às exigências de ano (${check.badgeText}).`;
      }
    }

    const newDriver: Driver = {
      id: `drv-${Math.floor(100 + Math.random() * 900)}`,
      name: regName,
      avatar: (finalCategory === 'moto_passageiro' || finalCategory === 'moto_entrega')
        ? 'https://images.unsplash.com/photo-1557862921-37829c790f19?w=150&auto=format&fit=crop&q=80'
        : 'https://images.unsplash.com/photo-1535713875002-d1d0cf377fde?w=150&auto=format&fit=crop&q=80',
      phone: regPhone,
      email: regEmail,
      password: regPassword,
      cpf: regCpf,
      cnh: `${regCnh || '09283719280'} (EAR Ativo)`,
      category: finalCategory,
      vehicleModel: regModel,
      vehiclePlate: regPlate.toUpperCase(),
      vehicleColor: regColor || 'Prata',
      vehicleYear: yearNum,
      rating: 5.0,
      totalRides: 0,
      status: 'online',
      lat: -23.0903,
      lng: -47.2180,
      weeklyPlanActive: true,
      weeklyFeePaidAt: new Date().toISOString(),
      weeklyFeeExpiresAt: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000).toISOString(),
      weeklyPlanExpiresAt: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000).toISOString(),
      weeklyPlanPrice: WEEKLY_FEE,
      pixKey: regPixKey.trim() || regCpf,
      trunkType: finalCategory === 'moto_entrega' ? regTrunkType : undefined,
      earningsToday: 0,
      earningsWeek: 0,
      cnhVerified: true,
      vehicleVerified: true,
      criminalRecordClear: true,
      registrationDate: new Date().toISOString().split('T')[0],
      comfortEligible,
      comfortEligibilityReason: reason,
    };

    // Determinar perfil e tipo para isolamento no sistema
    const userRole: UserRole = (finalCategory === 'moto_passageiro' || finalCategory === 'moto_entrega') ? 'motoboy' : 'driver';
    const userTipo: UserTipo = 
      finalCategory === 'economica' ? 'motorista_economico' :
      finalCategory === 'confort' ? 'motorista_confort' :
      finalCategory === 'moto_passageiro' ? 'motoboy_passageiro' : 'motoboy_entregas';

    // Salvar no localStorage com id único race_user_${email} SEM auto-login (setActiveSession = false)
    saveUserAccount({
      id: newDriver.id,
      name: newDriver.name,
      email: newDriver.email,
      phone: newDriver.phone,
      password: regPassword,
      role: userRole,
      tipo: userTipo,
      placa: newDriver.vehiclePlate,
      avatar: newDriver.avatar,
      rating: newDriver.rating,
      driverData: newDriver,
      createdAt: new Date().toISOString(),
    }, false);

    onRegisterDriver(newDriver);
    setRegisteredSuccess(false);

    // Conforme solicitado: após cadastro, entrar com login e senha dentro do aplicativo
    setLoginEmail(newDriver.email);
    setLoginPassword('');
    setLoginFeedback(null);
    setLoginSuccessNotice(
      `Cadastro de condutor (${newDriver.name}) realizado com sucesso! Para sua segurança, digite sua senha para entrar na sua conta.`
    );
    setActiveSubTab('login');

    try {
      confetti({
        particleCount: 70,
        spread: 75,
        origin: { y: 0.6 },
      });
    } catch {
      // safe
    }
  };

  const handleOpenPixModal = () => {
    setIsPixModalOpen(true);
    setProofSentSuccessNotice(null);
  };

  const handleCopyRacePixKey = () => {
    navigator.clipboard?.writeText(RACE_PIX_KEY);
    setCopiedRacePix(true);
    setTimeout(() => setCopiedRacePix(false), 2500);
  };

  const handleComprovanteFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      setComprovanteFileName(file.name);
      const reader = new FileReader();
      reader.onloadend = () => {
        setComprovanteImage(reader.result as string);
      };
      reader.readAsDataURL(file);
    }
  };

  const handleSubmitProofOfPayment = () => {
    setIsSubmittingProof(true);
    const finalId = (comprovanteId.trim() || `COMP-${Date.now().toString().slice(-6)}`).toUpperCase();
    const now = new Date().toISOString();
    
    setTimeout(() => {
      const updated: Driver = {
        ...currentDriver,
        pendingPayment: {
          status: 'pending',
          amount: WEEKLY_FEE,
          sentAt: now,
          comprovanteId: finalId,
          comprovanteUrl: comprovanteImage || undefined,
          driverName: currentDriver.name,
          driverPhone: currentDriver.phone,
        },
      };

      onUpdateDriver(updated);

      // Salvar na tabela public.pagamentos do Supabase
      savePagamentoSupabase({
        id: finalId,
        id_motorista: currentDriver.id,
        nome_motorista: currentDriver.name,
        email_motorista: currentDriver.email,
        valor: WEEKLY_FEE,
        status: 'pending',
        chave_pix: '9d9e5635-9e68-46bf-bffe-08bdae29c8ba',
        comprovante_url: comprovanteImage || undefined,
      });

      setIsSubmittingProof(false);
      setProofSentSuccessNotice(
        "Comprovante enviado! Aguarde aprovação do Admin em até 10 minutos. Você receberá notificação."
      );

      if (onTriggerToast) {
        onTriggerToast(
          'Comprovante PIX Enviado!',
          'Comprovante enviado! Aguarde aprovação do Admin em até 10 minutos. Você receberá notificação.',
          'financial'
        );
      }
    }, 600);
  };

  const handleSaveDriverPixKey = () => {
    const cleanKey = driverPixKey.trim();
    onUpdateDriver({
      ...currentDriver,
      pixKey: cleanKey,
    });
    setSavedDriverPixNotice(true);
    setTimeout(() => setSavedDriverPixNotice(false), 3000);
    if (onTriggerToast) {
      onTriggerToast(
        'Chave PIX Salva',
        'Sua chave PIX para receber 100% dos ganhos das corridas foi atualizada com sucesso.',
        'financial'
      );
    }
  };

  return (
    <div className="space-y-5">
      {/* Driver Portal Submenu Navigation in White */}
      <div className="bg-white border border-slate-200 p-2 rounded-2xl flex items-center gap-2 shadow-sm overflow-x-auto">
        <button
          onClick={() => setActiveSubTab('dashboard')}
          className={`flex-1 py-2.5 px-3 rounded-xl text-xs sm:text-sm font-heading font-black transition-all cursor-pointer whitespace-nowrap ${
            activeSubTab === 'dashboard'
              ? 'bg-amber-500 text-slate-950 shadow-md'
              : 'text-slate-600 hover:text-slate-900 hover:bg-slate-50'
          }`}
        >
          Meu Painel Condutor
        </button>
        <button
          onClick={() => setActiveSubTab('login')}
          className={`flex-1 py-2.5 px-3 rounded-xl text-xs sm:text-sm font-heading font-black transition-all cursor-pointer flex items-center justify-center gap-1.5 whitespace-nowrap ${
            activeSubTab === 'login'
              ? 'bg-amber-500 text-slate-950 shadow-md'
              : 'text-slate-600 hover:text-slate-900 hover:bg-slate-50'
          }`}
        >
          <LogIn className="w-4 h-4" />
          <span>Login / Entrar</span>
        </button>
        <button
          onClick={() => setActiveSubTab('register')}
          className={`flex-1 py-2.5 px-3 rounded-xl text-xs sm:text-sm font-heading font-black transition-all cursor-pointer whitespace-nowrap ${
            activeSubTab === 'register'
              ? 'bg-amber-500 text-slate-950 shadow-md'
              : 'text-slate-600 hover:text-slate-900 hover:bg-slate-50'
          }`}
        >
          Novo Cadastro
        </button>
        <button
          onClick={() => setActiveSubTab('subscription')}
          className={`flex-1 py-2.5 px-3 rounded-xl text-xs sm:text-sm font-heading font-black transition-all cursor-pointer flex items-center justify-center gap-1.5 whitespace-nowrap ${
            activeSubTab === 'subscription'
              ? 'bg-amber-500 text-slate-950 shadow-md'
              : 'text-slate-600 hover:text-slate-900 hover:bg-slate-50'
          }`}
        >
          <span>Comissão 15% / Ganhos 85%</span>
          <span className="w-2.5 h-2.5 rounded-full bg-emerald-500"></span>
        </button>
      </div>

      {/* SUBTAB 1: DRIVER DASHBOARD */}
      {activeSubTab === 'dashboard' && (
        <div className="space-y-4">


          {/* Status & Online Toggle Card in White */}
          <div className="bg-white border border-slate-200 rounded-3xl p-5 sm:p-6 shadow-md">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-4">
                <div className="relative">
                  <img
                    src={currentDriver.avatar}
                    alt={currentDriver.name}
                    className="w-16 h-16 rounded-full object-cover border-2 border-amber-500 shadow-md"
                  />
                  <span
                    className={`absolute bottom-0 right-0 w-4 h-4 rounded-full border-2 border-white ${
                      isOnline ? 'bg-emerald-500 radar-pulse' : 'bg-slate-400'
                    }`}
                  />
                </div>
                <div>
                  <div className="flex flex-wrap items-center gap-2">
                    <h3 className="font-heading font-black text-slate-950 text-base sm:text-lg">
                      {currentDriver.name}
                    </h3>
                    {currentDriver.category === 'economica' && (
                      <span className="bg-slate-100 text-slate-800 text-xs font-black px-2 py-0.5 rounded-md border border-slate-300 flex items-center gap-1">
                        <Car className="w-3.5 h-3.5 text-slate-600" /> Motorista Econômico
                      </span>
                    )}
                    {currentDriver.category === 'confort' && (
                      <span className="bg-[#ff6a00]/15 text-[#ff6a00] text-xs font-black px-2 py-0.5 rounded-md border border-[#ff6a00]/30 flex items-center gap-1">
                        <Sparkles className="w-3.5 h-3.5" /> Motorista Confort
                      </span>
                    )}
                    {currentDriver.category === 'moto_passageiro' && (
                      <span className="bg-cyan-100 text-cyan-800 text-xs font-black px-2 py-0.5 rounded-md border border-cyan-200 flex items-center gap-1">
                        <Bike className="w-3.5 h-3.5" /> Motoboy Passageiro
                      </span>
                    )}
                    {currentDriver.category === 'moto_entrega' && (
                      <span className="bg-amber-100 text-amber-900 text-xs font-black px-2 py-0.5 rounded-md border border-amber-200 flex items-center gap-1">
                        <Package className="w-3.5 h-3.5" /> Motoboy Entregas {currentDriver.trunkType ? `(${currentDriver.trunkType})` : ''}
                      </span>
                    )}
                  </div>
                  <p className="text-sm text-amber-700 font-mono font-bold">
                    {currentDriver.vehicleModel} {currentDriver.vehicleYear ? `(${currentDriver.vehicleYear})` : ''} • {currentDriver.vehiclePlate}
                  </p>
                  <div className="flex items-center gap-2 mt-1">
                    <span className="text-sm text-slate-700 font-bold bg-amber-50 border border-amber-200 px-2 py-0.5 rounded-md">
                      {ratingStats.average.toFixed(1)} ★ ({ratingStats.totalReviews} avaliações)
                    </span>
                    <span className="text-xs bg-emerald-100 text-emerald-800 px-2 py-0.5 rounded font-black">
                      0% Taxas
                    </span>
                    <span className="text-xs text-slate-500 font-mono">
                      Login: {currentDriver.email}
                    </span>
                  </div>
                </div>
              </div>

              {/* Online Button */}
              <button
                onClick={toggleOnline}
                className={`flex items-center gap-2 px-5 py-3 rounded-2xl font-heading font-black text-xs sm:text-sm shadow-md transition-all cursor-pointer active:scale-95 ${
                  isOnline
                    ? 'bg-emerald-600 text-white hover:bg-emerald-500'
                    : 'bg-slate-100 text-slate-600 hover:bg-slate-200 border border-slate-300'
                }`}
              >
                <Power className="w-4 h-4" />
                <span>{isOnline ? 'ONLINE' : 'FICAR ONLINE'}</span>
              </button>
            </div>
          </div>

          {/* 100% Earnings Guarantee Banner */}
          <div className="bg-gradient-to-r from-amber-500/10 via-amber-500/20 to-amber-500/10 border-2 border-amber-400 rounded-3xl p-5 flex items-center justify-between shadow-sm">
            <div className="flex items-center gap-3.5">
              <div className="w-12 h-12 rounded-2xl bg-amber-500 text-slate-950 font-black flex items-center justify-center shrink-0 shadow-sm">
                <Zap className="w-6 h-6" />
              </div>
              <div>
                <h4 className="font-heading font-black text-amber-900 text-base sm:text-lg">
                  100% DOS GANHOS SÃO SEUS
                </h4>
                <p className="text-xs sm:text-sm text-slate-700 font-medium">
                  Sem comissão por corrida. Apenas assinatura semanal fixa de {WEEKLY_FEE_TEXT}.
                </p>
              </div>
            </div>

            <div className="text-right">
              <span className="text-xs text-slate-500 font-mono block font-bold">Status da Assinatura</span>
              <span className={`text-sm font-black flex items-center gap-1 justify-end ${
                subStatus.isActive ? 'text-emerald-700' : 'text-rose-600'
              }`}>
                {subStatus.isActive ? (
                  <CheckCircle2 className="w-4 h-4 text-emerald-600" />
                ) : (
                  <AlertTriangle className="w-4 h-4 text-rose-600" />
                )}
                {subStatus.label}
              </span>
            </div>
          </div>

          {/* Navegação entre as 4 Seções do Dashboard do Condutor */}
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-2 bg-slate-100 p-1.5 rounded-2xl border border-slate-200">
            <button
              type="button"
              onClick={() => setDashboardSection('corridas')}
              className={`py-2.5 px-3 rounded-xl text-xs sm:text-sm font-heading font-black transition-all cursor-pointer flex items-center justify-center gap-1.5 ${
                dashboardSection === 'corridas'
                  ? 'bg-amber-500 text-slate-950 shadow-sm'
                  : 'text-slate-600 hover:text-slate-950 hover:bg-white/60'
              }`}
            >
              <Car className="w-4 h-4" />
              <span>Minhas corridas</span>
            </button>
            <button
              type="button"
              onClick={() => setDashboardSection('ganhos')}
              className={`py-2.5 px-3 rounded-xl text-xs sm:text-sm font-heading font-black transition-all cursor-pointer flex items-center justify-center gap-1.5 ${
                dashboardSection === 'ganhos'
                  ? 'bg-amber-500 text-slate-950 shadow-sm'
                  : 'text-slate-600 hover:text-slate-950 hover:bg-white/60'
              }`}
            >
              <Wallet className="w-4 h-4" />
              <span>Meu Saldo</span>
            </button>
            <button
              type="button"
              onClick={() => setDashboardSection('assinatura')}
              className={`py-2.5 px-3 rounded-xl text-xs sm:text-sm font-heading font-black transition-all cursor-pointer flex items-center justify-center gap-1.5 ${
                dashboardSection === 'assinatura'
                  ? 'bg-amber-500 text-slate-950 shadow-sm'
                  : 'text-slate-600 hover:text-slate-950 hover:bg-white/60'
              }`}
            >
              <CreditCard className="w-4 h-4" />
              <span>Comissões (85%/15%)</span>
            </button>
            <button
              type="button"
              onClick={() => setDashboardSection('perfil')}
              className={`py-2.5 px-3 rounded-xl text-xs sm:text-sm font-heading font-black transition-all cursor-pointer flex items-center justify-center gap-1.5 ${
                dashboardSection === 'perfil'
                  ? 'bg-amber-500 text-slate-950 shadow-sm'
                  : 'text-slate-600 hover:text-slate-950 hover:bg-white/60'
              }`}
            >
              <UserCheck className="w-4 h-4" />
              <span>Meu perfil</span>
            </button>
          </div>

          {/* SEÇÃO 1: MINHAS CORRIDAS */}
          {dashboardSection === 'corridas' && (
            <div className="space-y-4">
              {/* Active Radar & Simulated Incoming Ride */}
              <div className="bg-white border border-slate-200 rounded-3xl p-5 sm:p-6 space-y-4 shadow-md">
                <div className="flex items-center justify-between border-b border-slate-200 pb-3">
                  <h4 className="font-heading font-black text-slate-950 text-sm sm:text-base uppercase tracking-wider flex items-center gap-2">
                    <span className="w-3 h-3 rounded-full bg-amber-500 radar-pulse" />
                    <span>Radar de Chamados Próximos (Indaiatuba)</span>
                  </h4>
                  <span className="text-xs text-slate-600 font-mono font-bold">GPS Otimizado</span>
                </div>

                {isOnline ? (
                  (() => {
                    const incomingPassengerAvatar = activeRide?.passengerAvatar || 'https://images.unsplash.com/photo-1544005313-94ddf0286df2?w=150&auto=format&fit=crop&q=80';
                    const incomingPassengerName = activeRide?.passengerName || 'Marina Gonçalves de Castro';
                    const incomingPassengerPhone = activeRide?.passengerPhone || '(19) 99887-1122';
                    const incomingPickupAddress = activeRide?.pickup?.address || 'Av. Presidente Vargas, 1250 - Centro, Indaiatuba - SP';
                    const incomingDestAddress = activeRide?.destination?.address || 'Av. dos Trabalhadores, 350 - Jardim América, Indaiatuba - SP';
                    const incomingPrice = activeRide?.price || 28.50;

                    return (
                      <div className="bg-gradient-to-b from-white via-slate-50 to-slate-100 p-5 sm:p-6 rounded-3xl border-2 border-[#ff6a00] shadow-xl space-y-4">
                        {/* Header da Chamada */}
                        <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3 border-b border-slate-200 pb-3.5">
                          <div className="flex items-center gap-2.5">
                            <span className="w-3.5 h-3.5 rounded-full bg-emerald-500 radar-pulse" />
                            <div>
                              <span className="bg-[#ff6a00] text-white font-heading font-black text-xs px-3 py-1 rounded-full uppercase tracking-wider shadow-sm">
                                NOVA CHAMADA DE CORRIDA
                              </span>
                              <p className="text-xs text-slate-500 font-mono font-bold mt-0.5">
                                A 1.2 km de você • Chegada estimada: 3 min
                              </p>
                            </div>
                          </div>
                          <div className="text-right self-end sm:self-auto space-y-0.5">
                            <span className="text-2xl sm:text-3xl font-heading font-black text-[#ff6a00] block">
                              {formatBRL(incomingPrice)}
                            </span>
                            <span className="text-xs font-bold text-emerald-700 bg-emerald-50 border border-emerald-300 px-2 py-0.5 rounded-full inline-block">
                              Você ganha {formatBRL(Number((incomingPrice * 0.85).toFixed(2)))} (85%)
                            </span>
                            <span className="text-[11px] font-mono text-slate-500 block">
                              Comissão Race 15%: {formatBRL(Number((incomingPrice * 0.15).toFixed(2)))}
                            </span>
                          </div>
                        </div>

                        {/* Card do Passageiro com Foto Cadastrada e Nome */}
                        <div className="bg-white rounded-2xl p-4 border border-slate-200 flex items-center justify-between gap-4 shadow-sm">
                          <div className="flex items-center gap-3.5">
                            <div className="relative shrink-0">
                              <img
                                src={incomingPassengerAvatar}
                                alt={incomingPassengerName}
                                className="w-16 h-16 sm:w-20 sm:h-20 rounded-full object-cover border-3 border-emerald-500 shadow-md"
                              />
                              <span className="absolute -bottom-1 -right-1 bg-white text-slate-900 border border-slate-300 text-[11px] px-1.5 py-0.2 rounded-full font-bold flex items-center shadow">
                                ★ 5.0
                              </span>
                            </div>
                            <div>
                              <span className="text-[10px] font-mono font-bold text-emerald-700 uppercase tracking-wider block">
                                Passageiro Solicitante
                              </span>
                              <h5 className="font-heading font-black text-slate-950 text-base sm:text-xl">
                                {incomingPassengerName}
                              </h5>
                              <p className="text-xs text-slate-600 font-mono mt-0.5">
                                Contato: <span className="font-bold text-slate-900">{incomingPassengerPhone}</span>
                              </p>
                            </div>
                          </div>

                          <a
                            href={`https://wa.me/55${incomingPassengerPhone.replace(/\D/g, '')}?text=${encodeURIComponent(
                              `Olá ${incomingPassengerName}! Sou seu condutor da RACE. Recebi sua chamada de corrida e estou a caminho!`
                            )}`}
                            target="_blank"
                            rel="noopener noreferrer"
                            className="p-3 bg-emerald-50 hover:bg-emerald-100 text-emerald-700 rounded-2xl border border-emerald-300 shadow-sm transition-all active:scale-95 shrink-0"
                            title="Ligar ou conversar no WhatsApp com o passageiro"
                          >
                            <Phone className="w-5 h-5" />
                          </a>
                        </div>

                        {/* Endereço de Início e Chegada com Número Correto */}
                        <div className="bg-white rounded-2xl p-4 border border-slate-200 space-y-3 shadow-xs">
                          {/* Início com Número Correto */}
                          <div className="flex items-start gap-3">
                            <div className="w-8 h-8 rounded-xl bg-emerald-100 text-emerald-700 flex items-center justify-center shrink-0 mt-0.5 border border-emerald-300 shadow-xs">
                              <MapPin className="w-4 h-4 text-emerald-600" />
                            </div>
                            <div className="space-y-0.5">
                              <span className="text-[11px] font-mono font-bold uppercase text-emerald-800 tracking-wider">
                                Ponto de Início (Embarque):
                              </span>
                              <p className="font-heading font-bold text-slate-900 text-sm sm:text-base leading-snug">
                                {incomingPickupAddress}
                              </p>
                            </div>
                          </div>

                          <div className="border-t border-dashed border-slate-200 my-1 ml-11" />

                          {/* Chegada com Número Correto */}
                          <div className="flex items-start gap-3">
                            <div className="w-8 h-8 rounded-xl bg-amber-100 text-amber-700 flex items-center justify-center shrink-0 mt-0.5 border border-amber-300 shadow-xs">
                              <Navigation className="w-4 h-4 text-[#ff6a00]" />
                            </div>
                            <div className="space-y-0.5">
                              <span className="text-[11px] font-mono font-bold uppercase text-amber-800 tracking-wider">
                                Ponto de Chegada (Destino):
                              </span>
                              <p className="font-heading font-bold text-slate-900 text-sm sm:text-base leading-snug">
                                {incomingDestAddress}
                              </p>
                            </div>
                          </div>
                        </div>

                        {acceptedRideNotice && (
                          <div className="bg-emerald-50 border border-emerald-300 text-emerald-900 p-3.5 rounded-xl font-bold text-sm flex items-center justify-between animate-fade-in flex-wrap gap-2">
                            <div className="flex items-center gap-2">
                              <CheckCircle2 className="w-5 h-5 text-emerald-600 shrink-0" />
                              <span>{acceptedRideNotice}</span>
                            </div>
                            <div className="flex items-center gap-2">
                              <button
                                onClick={() => setIsDriverGpsOpen(true)}
                                className="px-3 py-1 bg-emerald-600 hover:bg-emerald-500 text-white rounded-lg text-xs font-heading font-black cursor-pointer flex items-center gap-1 shadow-xs"
                              >
                                <Navigation className="w-3.5 h-3.5" />
                                <span>Abrir GPS</span>
                              </button>
                              <button
                                onClick={() => setAcceptedRideNotice(null)}
                                className="text-xs text-emerald-700 hover:text-emerald-900 font-bold ml-1 cursor-pointer"
                              >
                                ✕
                              </button>
                            </div>
                          </div>
                        )}

                        <div className="flex flex-col sm:flex-row items-center gap-2.5 pt-2">
                          <button
                            onClick={() => {
                              const driverEarns = Number((incomingPrice * 0.85).toFixed(2));
                              const raceCommission = Number((incomingPrice * 0.15).toFixed(2));
                              onUpdateDriver({
                                ...currentDriver,
                                earningsToday: currentDriver.earningsToday + driverEarns,
                                earningsWeek: currentDriver.earningsWeek + driverEarns,
                                totalRides: currentDriver.totalRides + 1,
                              });
                              if (activeRide && onAcceptIncomingRide) {
                                onAcceptIncomingRide(activeRide);
                              }
                              setAcceptedRideNotice(`Você ganhou ${formatBRL(driverEarns)} nesta corrida (85%) • Comissão Race 15%: ${formatBRL(raceCommission)}`);
                              setIsDriverGpsOpen(true);
                              try {
                                confetti({ particleCount: 40, spread: 55, origin: { y: 0.6 } });
                              } catch {}
                            }}
                            className="w-full sm:flex-1 bg-gradient-to-r from-[#ff6a00] to-[#e05e00] hover:from-[#ff7b1a] hover:to-[#eb6800] text-white font-heading font-black py-4 rounded-2xl text-sm sm:text-base transition-all cursor-pointer shadow-lg active:scale-95 text-center border border-[#ff8533] flex items-center justify-center gap-2"
                          >
                            <Navigation className="w-4 h-4" />
                            <span>ACEITAR E ABRIR GPS ({formatBRL(incomingPrice)})</span>
                          </button>

                          <button
                            type="button"
                            onClick={() => setIsDriverGpsOpen(true)}
                            className="w-full sm:w-auto px-4 py-4 bg-slate-950 hover:bg-zinc-800 text-white rounded-2xl text-xs sm:text-sm font-heading font-bold cursor-pointer border border-zinc-800 flex items-center justify-center gap-2 shadow-xs"
                          >
                            <Navigation className="w-4 h-4 text-emerald-400" />
                            <span>GPS (Waze/Uber)</span>
                          </button>

                          <button
                            onClick={onOpenSupport}
                            className="w-full sm:w-auto px-3.5 py-4 bg-white hover:bg-slate-100 text-slate-800 rounded-2xl text-xs sm:text-sm font-bold cursor-pointer border border-slate-300"
                          >
                            Suporte 24h
                          </button>
                        </div>
                      </div>
                    );
                  })()
                ) : (
                  <div className="text-center py-8 text-slate-600 text-sm">
                    <p>Você está atualmente <strong className="text-rose-600">OFFLINE</strong>.</p>
                    <p className="mt-1 text-slate-500 font-medium">
                      Clique em "Ficar Online" no topo para começar a receber corridas sem desconto de taxa.
                    </p>
                  </div>
                )}
              </div>

              {/* Lista isolada de corridas deste condutor */}
              <div className="bg-white border border-slate-200 rounded-3xl p-5 sm:p-6 shadow-md space-y-3">
                <div className="flex items-center justify-between border-b border-slate-200 pb-3">
                  <div>
                    <h4 className="font-heading font-black text-slate-950 text-base">
                      Minhas Corridas Atendidas
                    </h4>
                    <p className="text-xs text-slate-500">
                      Total registrado: {currentDriver.totalRides} corridas • 85% repasse líquido (Comissão Race 15%)
                    </p>
                  </div>
                  <span className="text-xs bg-amber-100 text-amber-900 font-bold px-2.5 py-1 rounded-full border border-amber-300">
                    Histórico Pessoal
                  </span>
                </div>

                {rides.filter((r) => r.driver?.id === currentDriver.id || r.driver?.email?.toLowerCase() === currentDriver.email?.toLowerCase()).length === 0 ? (
                  <div className="text-center py-8 bg-slate-50 rounded-2xl border border-dashed border-slate-300 p-6">
                    <Car className="w-10 h-10 text-slate-400 mx-auto mb-2" />
                    <p className="text-sm font-bold text-slate-700">Nenhuma corrida finalizada ainda</p>
                    <p className="text-xs text-slate-500 mt-1 max-w-sm mx-auto">
                      Suas corridas atendidas aparecerão exclusivamente aqui, com recibo e 85% dos ganhos creditados diretamente no seu saldo (comissão Race 15%).
                    </p>
                  </div>
                ) : (
                  <div className="space-y-3">
                    {rides
                      .filter((r) => r.driver?.id === currentDriver.id || r.driver?.email?.toLowerCase() === currentDriver.email?.toLowerCase())
                      .map((ride) => {
                        const driverEarns = ride.driverEarnings || Number((ride.price * 0.85).toFixed(2));
                        const raceCommission = ride.platformFee || Number((ride.price * 0.15).toFixed(2));
                        return (
                          <div key={ride.id} className="p-4 rounded-2xl border border-slate-200 bg-slate-50 flex items-center justify-between gap-4">
                            <div className="space-y-1">
                              <div className="flex items-center gap-2">
                                <span className="text-xs font-mono font-bold text-slate-500">#{ride.id}</span>
                                <span className="text-xs bg-emerald-100 text-emerald-800 font-black px-2 py-0.5 rounded">
                                  Concluída
                                </span>
                              </div>
                              <p className="text-sm font-bold text-slate-900">{ride.pickup.address} → {ride.destination.address}</p>
                              <p className="text-xs text-slate-500">Passageiro: {ride.passengerName} • {ride.distanceKm} km</p>
                            </div>
                            <div className="text-right shrink-0 space-y-0.5">
                              <span className="text-base font-heading font-black text-slate-900 block">{formatBRL(ride.price)}</span>
                              <span className="text-xs text-emerald-700 font-bold block">
                                Ganho (85%): {formatBRL(driverEarns)}
                              </span>
                              <span className="text-[10px] text-slate-500 font-mono block">
                                Race (15%): {formatBRL(raceCommission)}
                              </span>
                            </div>
                          </div>
                        );
                      })}
                  </div>
                )}
              </div>
            </div>
          )}

          {/* SEÇÃO 2: MEU SALDO (CARTEIRA DO MOTORISTA) */}
          {dashboardSection === 'ganhos' && (() => {
            const summary = calculateWalletSummary(currentDriver);

            return (
              <div className="space-y-4">
                {/* 1. Card Grande "Meu Saldo" */}
                <div className="bg-gradient-to-br from-[#111111] via-[#1a1a1a] to-[#0d0d0d] text-white border-2 border-[#ff6a00] rounded-3xl p-5 sm:p-6 shadow-2xl space-y-4">
                  <div className="flex items-center justify-between border-b border-zinc-800 pb-3">
                    <div className="flex items-center gap-2.5">
                      <div className="w-10 h-10 rounded-xl bg-[#ff6a00]/20 text-[#ff6a00] flex items-center justify-center border border-[#ff6a00]/40">
                        <Wallet className="w-5 h-5" />
                      </div>
                      <div>
                        <span className="text-[11px] font-bold text-zinc-400 uppercase tracking-wider block">
                          Carteira do Motorista
                        </span>
                        <h3 className="font-heading font-black text-white text-lg">Meu Saldo</h3>
                      </div>
                    </div>
                    <span className="text-xs font-mono font-bold text-emerald-400 bg-emerald-950/60 border border-emerald-500/40 px-3 py-1 rounded-full">
                      Corridas Pagas no App
                    </span>
                  </div>

                  <div>
                    <span className="text-xs text-zinc-400 font-medium block">Saldo Disponível:</span>
                    <div className="text-4xl sm:text-5xl font-heading font-black text-[#ff6a00] mt-1 tracking-tight">
                      {formatBRL(summary.gross)}
                    </div>
                    <div className="mt-2 inline-flex items-center gap-1.5 px-3 py-1 rounded-xl bg-emerald-950/60 border border-emerald-500/40 text-emerald-300 text-xs font-bold">
                      <CheckCircle2 className="w-3.5 h-3.5 text-emerald-400 shrink-0" />
                      <span>Seu saldo: {formatBRL(summary.gross)} - Comissão Race já descontada</span>
                    </div>
                    <p className="text-xs text-zinc-400 mt-2">
                      Você recebe 85% líquido de cada corrida direto no seu saldo. A comissão de intermediação da Race (15%) já é retida automaticamente na finalização da viagem.
                    </p>
                  </div>

                  {/* Modelo 85% Motorista / 15% Race */}
                  <div className="bg-zinc-900/90 border border-zinc-700/80 rounded-2xl p-4 space-y-2">
                    <span className="text-[11px] font-bold text-amber-400 uppercase tracking-wider block">
                      Divisão de Ganhos: 85% para Você • 15% Race
                    </span>
                    <div className="grid grid-cols-2 gap-3 pt-1">
                      <div className="p-3 bg-black/40 rounded-xl border border-zinc-800">
                        <span className="text-[10px] text-zinc-400 uppercase font-bold block">Seu Ganho Líquido (85%)</span>
                        <span className="text-base sm:text-lg font-heading font-black text-emerald-400">{formatBRL(summary.gross)}</span>
                      </div>
                      <div className="p-3 bg-black/40 rounded-xl border border-zinc-800">
                        <span className="text-[10px] text-zinc-400 uppercase font-bold block">Comissão Race (15%)</span>
                        <span className="text-base sm:text-lg font-heading font-black text-amber-400">
                          {formatBRL(summary.gross > 0 ? Number((summary.gross / 0.85 * 0.15).toFixed(2)) : 0)}
                        </span>
                      </div>
                    </div>
                    <p className="text-xs text-zinc-400">
                      Sem taxa semanal de R$ 200, sem mensalidade e sem custo para trabalhar. Saque seu saldo a qualquer momento via PIX.
                    </p>
                  </div>

                  {/* Feedback de Sucesso */}
                  {withdrawalSuccessMessage && (
                    <div className="bg-emerald-950/70 border border-emerald-500/80 rounded-2xl p-4 text-emerald-200 text-sm font-bold flex items-center gap-2.5 animate-fade-in">
                      <CheckCircle2 className="w-5 h-5 text-emerald-400 shrink-0" />
                      <span>{withdrawalSuccessMessage}</span>
                    </div>
                  )}

                  {/* Feedback de Erro */}
                  {withdrawalErrorMessage && (
                    <div className="bg-rose-950/70 border border-rose-500/80 rounded-2xl p-4 text-rose-200 text-sm font-bold flex items-center gap-2.5 animate-fade-in">
                      <XCircle className="w-5 h-5 text-rose-400 shrink-0" />
                      <span>{withdrawalErrorMessage}</span>
                    </div>
                  )}

                  {/* 3. Área de Saque */}
                  <div className="pt-2 border-t border-zinc-800 space-y-3">
                    <div>
                      <label className="text-xs font-bold text-zinc-300 block mb-1">
                        Sua Chave PIX para receber o Saque ({formatBRL(summary.net)}):
                      </label>
                      <input
                        type="text"
                        value={walletPixKey}
                        onChange={(e) => setWalletPixKey(e.target.value)}
                        placeholder="Informe seu CPF, Celular, E-mail ou Chave Aleatória"
                        className="w-full bg-zinc-900 border border-zinc-700 rounded-xl px-4 py-3 text-sm font-mono text-white placeholder-zinc-500 focus:outline-none focus:border-[#ff6a00]"
                      />
                    </div>

                    <button
                      type="button"
                      onClick={() => handleRequestWithdrawalAction(summary)}
                      disabled={!summary.canWithdraw}
                      className={`w-full py-4 px-5 rounded-2xl font-heading font-black text-base uppercase tracking-wider flex items-center justify-center gap-2 transition-all shadow-xl ${
                        summary.canWithdraw
                          ? 'bg-gradient-to-r from-emerald-600 via-emerald-500 to-emerald-600 hover:brightness-110 active:scale-95 text-white border border-emerald-400 cursor-pointer'
                          : 'bg-zinc-800 text-zinc-500 border border-zinc-700 cursor-not-allowed opacity-60'
                      }`}
                    >
                      <ArrowDownCircle className="w-5 h-5" />
                      <span>Sacar {formatBRL(summary.net)}</span>
                    </button>
                    {summary.canWithdraw && (
                      <p className="text-[11px] text-center text-zinc-400 font-medium">
                        Admin vai enviar o pagamento para sua chave PIX em até 24h.
                      </p>
                    )}
                  </div>
                </div>

                {/* 4. Histórico de Saques do Motorista */}
                <div className="bg-white border border-slate-200 rounded-3xl p-5 sm:p-6 shadow-md space-y-3">
                  <h4 className="font-heading font-black text-slate-950 text-base flex items-center gap-2">
                    <Clock className="w-5 h-5 text-[#ff6a00]" />
                    <span>Meus Saques Solicitados</span>
                  </h4>
                  {driverWithdrawals.length === 0 ? (
                    <p className="text-xs text-slate-500 py-3 text-center">
                      Nenhum saque solicitado ainda. Seu saldo acumula automaticamente a cada corrida paga pelos passageiros.
                    </p>
                  ) : (
                    <div className="space-y-2.5">
                      {driverWithdrawals.map((w) => (
                        <div
                          key={w.id}
                          className="p-3.5 bg-slate-50 rounded-2xl border border-slate-200 flex flex-col sm:flex-row sm:items-center justify-between gap-2 shadow-2xs"
                        >
                          <div>
                            <div className="flex items-center gap-2">
                              <span className="font-mono font-bold text-xs text-slate-900">{w.id}</span>
                              <span
                                className={`text-[10px] font-bold px-2 py-0.5 rounded-full ${
                                  w.status === 'paid'
                                    ? 'bg-emerald-100 text-emerald-800 border border-emerald-300'
                                    : 'bg-amber-100 text-amber-800 border border-amber-300'
                                }`}
                              >
                                {w.status === 'paid' ? '✓ Pago via PIX' : '⏳ Pendente (Admin envia em até 24h)'}
                              </span>
                            </div>
                            <p className="text-xs text-slate-500 mt-0.5">
                              Bruto: {formatBRL(w.grossAmount)} &bull; Desconto semana: -{formatBRL(w.weeklyFeeDeducted)} &bull; Chave PIX: {w.pixKey}
                            </p>
                            <p className="text-[10px] text-slate-400 font-mono">
                              Solicitado em: {new Date(w.requestedAt).toLocaleString('pt-BR')}
                            </p>
                          </div>
                          <div className="text-right">
                            <span className="text-[10px] text-slate-500 uppercase block font-bold">Valor do Saque</span>
                            <span className="font-heading font-black text-emerald-700 text-lg sm:text-xl">
                              {formatBRL(w.netAmount)}
                            </span>
                          </div>
                        </div>
                      ))}
                    </div>
                  )}
                </div>
              </div>
            );
          })()}

          {/* SEÇÃO 3: COMISSÕES & MODELO 85% / 15% */}
          {dashboardSection === 'assinatura' && (
            <div className="space-y-4">
              <div className="bg-white border border-slate-200 rounded-3xl p-6 shadow-md space-y-5">
                <div className="flex items-center justify-between border-b border-slate-200 pb-4">
                  <div>
                    <span className="text-xs font-bold text-emerald-700 bg-emerald-50 px-2.5 py-0.5 rounded-full border border-emerald-200 uppercase tracking-wider inline-block mb-1">
                      NOVO MODELO RACE
                    </span>
                    <h3 className="font-heading font-black text-2xl text-slate-950">85% para Você • 15% Race</h3>
                  </div>
                  <span className="px-3 py-1 rounded-full text-xs font-heading font-black flex items-center gap-1.5 bg-emerald-100 text-emerald-800 border border-emerald-300">
                    <CheckCircle2 className="w-4 h-4 text-emerald-600" />
                    <span>TAXA ZERO PARA TRABALHAR</span>
                  </span>
                </div>

                <div className="bg-slate-50 p-4 sm:p-5 rounded-2xl border border-slate-200 space-y-3">
                  <div className="flex items-center justify-between text-sm">
                    <span className="text-slate-600 font-medium">Mensalidade:</span>
                    <span className="font-bold text-emerald-700">R$ 0,00 (Sem mensalidade)</span>
                  </div>
                  <div className="flex items-center justify-between text-sm">
                    <span className="text-slate-600 font-medium">Taxa semanal anterior:</span>
                    <span className="font-bold text-slate-500 line-through">R$ 200,00 / semana (Cancelada)</span>
                  </div>
                  <div className="flex items-center justify-between text-sm">
                    <span className="text-slate-600 font-medium">Repasse líquido por corrida:</span>
                    <span className="font-black text-emerald-700">85% do valor integral</span>
                  </div>
                  <div className="flex items-center justify-between text-sm">
                    <span className="text-slate-600 font-medium">Comissão Race:</span>
                    <span className="font-bold text-amber-700">15% de intermediação</span>
                  </div>
                </div>

                {/* Tabela de Exemplos */}
                <div className="space-y-2">
                  <h4 className="text-xs font-heading font-black text-slate-700 uppercase tracking-wider">
                    Exemplos Reais de Ganhos:
                  </h4>
                  <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 text-xs">
                    <div className="p-3 bg-orange-50/70 border border-orange-200 rounded-xl space-y-1">
                      <span className="font-black text-orange-800 block">Confort (R$ 11,20)</span>
                      <p className="text-emerald-700 font-bold">Você recebe: R$ 9,52</p>
                      <p className="text-slate-500">Race 15%: R$ 1,68</p>
                    </div>
                    <div className="p-3 bg-cyan-50/70 border border-cyan-200 rounded-xl space-y-1">
                      <span className="font-black text-cyan-800 block">Motoboy Passageiro (R$ 6,16)</span>
                      <p className="text-emerald-700 font-bold">Você recebe: R$ 5,24</p>
                      <p className="text-slate-500">Race 15%: R$ 0,92</p>
                    </div>
                    <div className="p-3 bg-amber-50/70 border border-amber-200 rounded-xl space-y-1">
                      <span className="font-black text-amber-800 block">Motoboy Entregas (R$ 6,90)</span>
                      <p className="text-emerald-700 font-bold">Você recebe: R$ 5,87</p>
                      <p className="text-slate-500">Race 15%: R$ 1,03</p>
                    </div>
                  </div>
                </div>

                <button
                  type="button"
                  onClick={() => setDashboardSection('ganhos')}
                  className="w-full py-4 rounded-2xl bg-[#ff6a00] hover:bg-[#e05e00] text-white font-heading font-black text-sm sm:text-base shadow-md cursor-pointer transition-all active:scale-[0.99] flex items-center justify-center gap-2"
                >
                  <Wallet className="w-5 h-5" />
                  <span>IR PARA MEU SALDO & SOLICITAR SAQUE</span>
                </button>
              </div>
            </div>
          )}

          {/* SEÇÃO 4: MEU PERFIL */}
          {dashboardSection === 'perfil' && (
            <div className="space-y-4">
              <div className="bg-white border border-slate-200 rounded-3xl p-6 shadow-md space-y-5">
                <input
                  ref={driverAvatarInputRef}
                  type="file"
                  accept="image/*"
                  onChange={handleDriverAvatarUpload}
                  className="hidden"
                  id="driver-profile-photo-input"
                />
                <input
                  ref={cnhDocInputRef}
                  type="file"
                  accept="image/*"
                  onChange={handleCnhDocUpload}
                  className="hidden"
                  id="driver-cnh-photo-input"
                />
                <input
                  ref={vehicleDocInputRef}
                  type="file"
                  accept="image/*"
                  onChange={handleVehicleDocUpload}
                  className="hidden"
                  id="driver-vehicle-photo-input"
                />

                <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 border-b border-slate-200 pb-4">
                  <div className="flex items-center gap-4">
                    <div 
                      onClick={() => driverAvatarInputRef.current?.click()}
                      className="relative group cursor-pointer shrink-0"
                    >
                      <img
                        src={currentDriver.avatar}
                        alt={currentDriver.name}
                        className="w-20 h-20 rounded-full object-cover border-4 border-amber-500 shadow-md group-hover:opacity-90 transition-opacity"
                      />
                      <button
                        type="button"
                        onClick={(e) => {
                          e.stopPropagation();
                          driverAvatarInputRef.current?.click();
                        }}
                        className="absolute bottom-0 right-0 p-1.5 rounded-full bg-[#ff6a00] hover:bg-[#e05e00] text-white shadow-md border-2 border-white transition-all cursor-pointer active:scale-95"
                        title="Trocar foto pela galeria do celular"
                      >
                        <Camera className="w-3.5 h-3.5" />
                      </button>
                    </div>

                    <div>
                      <h3 className="font-heading font-black text-xl text-slate-950">{currentDriver.name}</h3>
                      <p className="text-xs sm:text-sm text-slate-500 font-mono">{currentDriver.email}</p>
                      <div className="flex items-center gap-2 mt-1.5 flex-wrap">
                        <button
                          type="button"
                          onClick={() => driverAvatarInputRef.current?.click()}
                          className="text-xs font-heading font-black text-[#ff6a00] hover:underline flex items-center gap-1 cursor-pointer"
                        >
                          <Camera className="w-3 h-3" />
                          <span>Trocar foto de perfil</span>
                        </button>
                        <span className="text-slate-300">•</span>
                        <span className="bg-emerald-100 text-emerald-800 text-xs font-bold px-2 py-0.5 rounded-full border border-emerald-300">
                          CNH EAR Homologada
                        </span>
                        <span className="bg-slate-100 text-slate-800 text-xs font-bold px-2 py-0.5 rounded-full border border-slate-300">
                          {ratingStats.average.toFixed(1)} ★ ({ratingStats.totalReviews} avaliações)
                        </span>
                      </div>
                    </div>
                  </div>
                </div>

                {/* Card de Avaliações e Últimos 3 Comentários dos Passageiros */}
                <div className="bg-white border-2 border-amber-300 rounded-3xl p-5 shadow-sm space-y-3.5">
                  <div className="flex items-center justify-between border-b border-slate-100 pb-3">
                    <div>
                      <span className="text-[11px] font-mono font-black text-[#ff6a00] uppercase tracking-wider block">
                        Reputação & Feedback Oficial
                      </span>
                      <h4 className="font-heading font-black text-slate-950 text-base sm:text-lg flex items-center gap-2">
                        <span>Média das avaliações:</span>
                        <span className="text-amber-500 font-mono font-black">
                          {ratingStats.average.toFixed(1)} ★
                        </span>
                        <span className="text-xs font-mono font-bold text-slate-500">
                          - {ratingStats.totalReviews} avaliações
                        </span>
                      </h4>
                    </div>
                    <span className="bg-amber-100 text-amber-900 text-xs font-mono font-black px-3 py-1 rounded-full border border-amber-300 shrink-0">
                      ★ {ratingStats.average.toFixed(1)}
                    </span>
                  </div>

                  <div className="space-y-2">
                    <span className="text-xs font-heading font-bold text-slate-700 block">
                      Últimos 3 comentários dos passageiros:
                    </span>
                    {ratingStats.recentReviews.length > 0 ? (
                      <div className="space-y-2">
                        {ratingStats.recentReviews.map((rev) => (
                          <div
                            key={rev.id}
                            className="bg-slate-50 border border-slate-200 rounded-2xl p-3.5 text-xs space-y-1 shadow-2xs"
                          >
                            <div className="flex items-center justify-between">
                              <span className="text-amber-500 font-mono font-bold tracking-widest text-sm">
                                {'★'.repeat(rev.rating)}
                              </span>
                              <span className="text-[10px] text-slate-400 font-mono">
                                {new Date(rev.createdAt).toLocaleDateString('pt-BR')}
                              </span>
                            </div>
                            <p className="text-slate-900 font-bold text-xs sm:text-sm">
                              "{rev.comment}"
                            </p>
                            <span className="text-[11px] text-slate-500 font-medium block">
                              Passageiro(a): {rev.passengerName}
                            </span>
                          </div>
                        ))}
                      </div>
                    ) : (
                      <div className="bg-slate-50 border border-slate-200 rounded-2xl p-3 text-xs text-slate-700 space-y-1">
                        <div className="flex items-center gap-2 text-amber-500 font-bold">
                          <span>★★★★★</span>
                          <span className="text-slate-800 font-bold">- Chegou rápido e carro limpo</span>
                          <span className="text-slate-500 font-normal">— Maria</span>
                        </div>
                      </div>
                    )}
                  </div>
                </div>

                {/* Banner de Saldo e Carteira */}
                <div 
                  onClick={() => setDashboardSection('ganhos')}
                  className="bg-gradient-to-r from-amber-500/10 via-orange-500/10 to-amber-500/10 border-2 border-[#ff6a00]/30 rounded-2xl p-4 flex items-center justify-between cursor-pointer hover:border-[#ff6a00] transition-all group"
                >
                  <div className="flex items-center gap-3">
                    <div className="w-10 h-10 rounded-xl bg-[#ff6a00] text-white flex items-center justify-center font-bold">
                      <Wallet className="w-5 h-5" />
                    </div>
                    <div>
                      <span className="text-xs text-slate-500 font-bold uppercase block">Meu Saldo no App</span>
                      <span className="text-xl font-heading font-black text-slate-900">
                        R$ {walletSummary.gross.toFixed(2)}
                      </span>
                    </div>
                  </div>
                  <button
                    type="button"
                    onClick={(e) => {
                      e.stopPropagation();
                      setDashboardSection('ganhos');
                    }}
                    className="text-xs font-black bg-[#ff6a00] hover:bg-[#e05e00] text-white px-3 py-1.5 rounded-xl shadow-sm transition-transform active:scale-95 cursor-pointer"
                  >
                    Gerenciar Carteira & Saque →
                  </button>
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3.5 text-sm">
                  <div className="bg-slate-50 p-3.5 rounded-2xl border border-slate-200">
                    <span className="text-[11px] font-bold text-slate-500 uppercase block">Celular / WhatsApp</span>
                    <span className="font-bold text-slate-900">{currentDriver.phone || 'Não informado'}</span>
                  </div>
                  <div className="bg-slate-50 p-3.5 rounded-2xl border border-slate-200">
                    <span className="text-[11px] font-bold text-slate-500 uppercase block">CPF</span>
                    <span className="font-bold text-slate-900">{currentDriver.cpf || '***.***.***-**'}</span>
                  </div>
                  <div className="bg-slate-50 p-3.5 rounded-2xl border border-slate-200">
                    <span className="text-[11px] font-bold text-slate-500 uppercase block">Veículo / Modelo</span>
                    <span className="font-bold text-slate-900">{currentDriver.vehicleModel} ({currentDriver.vehicleYear || '2022'})</span>
                  </div>
                  <div className="bg-slate-50 p-3.5 rounded-2xl border border-slate-200">
                    <span className="text-[11px] font-bold text-slate-500 uppercase block">Placa do Veículo</span>
                    <span className="font-mono font-black text-amber-700">{currentDriver.vehiclePlate || 'RCE9C40'}</span>
                  </div>
                  <div className="bg-slate-50 p-3.5 rounded-2xl border border-slate-200">
                    <span className="text-[11px] font-bold text-slate-500 uppercase block">Categoria</span>
                    <span className="font-bold text-slate-900 capitalize">{currentDriver.category.replace('_', ' ')}</span>
                  </div>
                  <div className="bg-slate-50 p-3.5 rounded-2xl border border-slate-200">
                    <span className="text-[11px] font-bold text-slate-500 uppercase block">Cor do Veículo</span>
                    <span className="font-bold text-slate-900">{currentDriver.vehicleColor || 'Prata'}</span>
                  </div>
                </div>

                {/* Documentos & Fotos do Motorista (CNH, Veículo, etc.) */}
                <div className="space-y-3 pt-2 border-t border-slate-200">
                  <h4 className="font-heading font-black text-slate-900 text-sm uppercase tracking-wider flex items-center gap-2">
                    <FileCheck className="w-4 h-4 text-[#ff6a00]" />
                    <span>Documentos e Fotos do Veículo</span>
                  </h4>

                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-3.5">
                    {/* CNH com foto */}
                    <div className="p-4 rounded-2xl bg-slate-50 border border-slate-200 flex flex-col justify-between space-y-2">
                      <div>
                        <div className="flex items-center justify-between">
                          <span className="text-xs font-heading font-black text-slate-900">
                            Foto da CNH com EAR
                          </span>
                          <span className="text-[11px] font-bold text-emerald-700 bg-emerald-100 px-2 py-0.5 rounded-full">
                            Validada
                          </span>
                        </div>
                        <p className="text-xs text-slate-500 mt-1 font-mono">
                          Número: {currentDriver.cnh || '99887766554'}
                        </p>
                      </div>

                      {cnhDocPreview && (
                        <div className="w-full h-24 rounded-xl overflow-hidden border border-slate-300 mt-2">
                          <img src={cnhDocPreview} alt="Preview CNH" className="w-full h-full object-cover" />
                        </div>
                      )}

                      <button
                        type="button"
                        onClick={() => cnhDocInputRef.current?.click()}
                        className="w-full py-2.5 px-3 bg-white hover:bg-slate-100 border border-slate-300 rounded-xl text-xs font-heading font-black text-slate-800 transition-all cursor-pointer flex items-center justify-center gap-2 mt-2"
                      >
                        <Camera className="w-3.5 h-3.5 text-[#ff6a00]" />
                        <span>{cnhDocPreview ? 'Trocar Foto da CNH' : 'Atualizar Foto da CNH'}</span>
                      </button>
                    </div>

                    {/* Foto do Veículo (Carro / Moto) */}
                    <div className="p-4 rounded-2xl bg-slate-50 border border-slate-200 flex flex-col justify-between space-y-2">
                      <div>
                        <div className="flex items-center justify-between">
                          <span className="text-xs font-heading font-black text-slate-900">
                            Foto do Veículo ({currentDriver.vehicleModel})
                          </span>
                          <span className="text-[11px] font-bold text-emerald-700 bg-emerald-100 px-2 py-0.5 rounded-full">
                            Regular
                          </span>
                        </div>
                        <p className="text-xs text-slate-500 mt-1 font-mono">
                          Placa: {currentDriver.vehiclePlate} &bull; Cor: {currentDriver.vehicleColor}
                        </p>
                      </div>

                      {vehicleDocPreview && (
                        <div className="w-full h-24 rounded-xl overflow-hidden border border-slate-300 mt-2">
                          <img src={vehicleDocPreview} alt="Preview Veículo" className="w-full h-full object-cover" />
                        </div>
                      )}

                      <button
                        type="button"
                        onClick={() => vehicleDocInputRef.current?.click()}
                        className="w-full py-2.5 px-3 bg-white hover:bg-slate-100 border border-slate-300 rounded-xl text-xs font-heading font-black text-slate-800 transition-all cursor-pointer flex items-center justify-center gap-2 mt-2"
                      >
                        <Camera className="w-3.5 h-3.5 text-[#ff6a00]" />
                        <span>{vehicleDocPreview ? 'Trocar Foto do Veículo' : 'Atualizar Foto do Veículo'}</span>
                      </button>
                    </div>
                  </div>
                </div>

                <div className="p-4 bg-emerald-50 rounded-2xl border border-emerald-200 flex items-center gap-3">
                  <ShieldCheck className="w-8 h-8 text-emerald-600 shrink-0" />
                  <div>
                    <h5 className="font-heading font-black text-emerald-950 text-xs sm:text-sm">
                      Privacidade e Isolamento de Dados Garantidos
                    </h5>
                    <p className="text-xs text-emerald-800">
                      Sua conta é 100% individual. Nenhum outro motorista tem acesso aos seus dados, corridas, ganhos ou chave PIX.
                    </p>
                  </div>
                </div>
              </div>
            </div>
          )}

          {/* Quick Support & Help Card */}
          <div className="bg-white border border-slate-200 rounded-3xl p-5 flex items-center justify-between shadow-md">
            <div className="flex items-center gap-4">
              <div className="w-12 h-12 rounded-2xl bg-slate-100 text-amber-700 flex items-center justify-center shrink-0">
                <Headphones className="w-6 h-6" />
              </div>
              <div>
                <h5 className="font-heading font-black text-slate-950 text-sm sm:text-base">
                  Suporte Técnico e Jurídico 24h
                </h5>
                <p className="text-xs sm:text-sm text-slate-600 font-medium">
                  Linha prioritária para motoristas e motoboys credenciados RACE
                </p>
              </div>
            </div>

            <button
              onClick={onOpenSupport}
              className="px-4 py-2.5 bg-slate-100 hover:bg-slate-200 text-slate-950 text-xs sm:text-sm font-extrabold rounded-xl border border-slate-300 transition-all cursor-pointer"
            >
              Falar Agora
            </button>
          </div>
        </div>
      )}

      {/* SUBTAB 2: LOGIN DO CONDUTOR (DESIGN PRETO E LARANJA #ff6a00) */}
      {activeSubTab === 'login' && (
        <div className="bg-[#000000] border-2 border-[#1a1a1a] rounded-3xl p-6 sm:p-8 shadow-2xl space-y-6 max-w-md mx-auto text-white">
          <div className="text-center space-y-1.5 pb-2">
            <h1 className="text-5xl font-heading font-black text-[#ff6a00] tracking-tighter uppercase select-none">
              RACE
            </h1>
            <p className="text-zinc-300 font-medium text-sm tracking-wide">
              App do Motorista
            </p>
          </div>

          {loginSuccessNotice && (
            <div className="bg-emerald-950/80 border border-emerald-500/80 text-emerald-200 text-xs sm:text-sm p-3.5 rounded-xl font-medium flex items-start gap-2.5">
              <CheckCircle className="w-5 h-5 text-emerald-400 shrink-0 mt-0.5" />
              <span>{loginSuccessNotice}</span>
            </div>
          )}

          {loginFeedback && (
            <div className="bg-red-950/80 border border-red-500/80 text-red-200 text-xs sm:text-sm p-3.5 rounded-xl font-medium flex items-center gap-2">
              <AlertTriangle className="w-4 h-4 text-red-400 shrink-0" />
              <span>{loginFeedback}</span>
            </div>
          )}

          <form onSubmit={handleLoginSubmit} className="space-y-5">
            <div className="space-y-2">
              <label className="text-white text-xs font-bold uppercase tracking-wider block">
                EMAIL
              </label>
              <input
                type="email"
                required
                value={loginEmail}
                onChange={(e) => setLoginEmail(e.target.value)}
                placeholder="seu.email@exemplo.com"
                className="w-full bg-[#1a1a1a] border border-[#2a2a2a] text-white placeholder-zinc-500 rounded-xl px-4 py-3.5 text-base focus:outline-none focus:border-[#ff6a00] transition-colors"
              />
            </div>

            <div className="space-y-2">
              <label className="text-white text-xs font-bold uppercase tracking-wider block">
                SENHA
              </label>
              <div className="relative">
                <input
                  type={showLoginPassword ? 'text' : 'password'}
                  required
                  value={loginPassword}
                  onChange={(e) => setLoginPassword(e.target.value)}
                  placeholder="••••••••"
                  className="w-full bg-[#1a1a1a] border border-[#2a2a2a] text-white placeholder-zinc-500 rounded-xl px-4 py-3.5 text-base focus:outline-none focus:border-[#ff6a00] transition-colors pr-12"
                />
                <button
                  type="button"
                  onClick={() => setShowLoginPassword(!showLoginPassword)}
                  className="absolute right-4 top-4 text-zinc-400 hover:text-white transition-colors cursor-pointer"
                >
                  {showLoginPassword ? <EyeOff className="w-5 h-5" /> : <Eye className="w-5 h-5" />}
                </button>
              </div>
            </div>

            <button
              type="submit"
              className="w-full bg-[#ff6a00] hover:bg-[#e05e00] active:scale-[0.99] text-white font-heading font-black text-lg py-4 px-6 rounded-xl transition-all cursor-pointer shadow-lg shadow-[#ff6a00]/20 uppercase tracking-wider block mt-6"
            >
              ENTRAR
            </button>

            <div className="text-center pt-1">
              <button
                type="button"
                onClick={() => setActiveSubTab('register')}
                className="text-[#ff6a00] hover:underline text-sm font-bold transition-all cursor-pointer inline-block"
              >
                Criar conta de motorista
              </button>
            </div>
          </form>


        </div>
      )}

      {/* SUBTAB 3: REGISTRATION BY CATEGORY WITH ALL REQUIRED OPERATIONAL INFORMATION */}
      {activeSubTab === 'register' && (() => {
        const selectedGuide = CATEGORY_GUIDES[regCategory] || CATEGORY_GUIDES.economica;
        const presets = CATEGORY_PRESETS[regCategory] || [];

        return (
          <div className="bg-white border border-slate-200 rounded-3xl p-5 sm:p-7 shadow-md space-y-6">
            {/* Header da Aba de Cadastro */}
            <div className="border-b border-slate-200 pb-5">
              <div className="flex items-center gap-3">
                <div className="w-12 h-12 bg-amber-500/20 text-[#ff6a00] rounded-2xl flex items-center justify-center font-bold border border-[#ff6a00]/30 shadow-xs shrink-0">
                  <UserCheck className="w-6 h-6" />
                </div>
                <div>
                  <h3 className="font-heading font-black text-slate-950 text-xl sm:text-2xl">
                    Novo Cadastro de Parceiro RACE - Indaiatuba
                  </h3>
                  <p className="text-xs sm:text-sm text-slate-600 font-medium mt-0.5">
                    Escolha a sua categoria de atuação para conferir todas as exigências, regras, remuneração e preencher o cadastro para exercer as atividades.
                  </p>
                </div>
              </div>
            </div>

            {/* SELETOR DAS 4 OPÇÕES DE CATEGORIA */}
            <div className="space-y-2">
              <div className="flex items-center justify-between">
                <span className="text-xs font-heading font-black uppercase tracking-wider text-slate-700">
                  Selecione a Categoria de Atividade para Cadastro:
                </span>
                <span className="text-[11px] font-mono font-bold text-[#ff6a00] bg-orange-50 px-2 py-0.5 rounded border border-orange-200">
                  100% dos Ganhos Livres
                </span>
              </div>

              <div className="grid grid-cols-2 lg:grid-cols-4 gap-3">
                {[
                  {
                    id: 'economica' as VehicleCategory,
                    title: 'Motorista Econômico',
                    desc: 'Carro comum 4 portas',
                    rate: 'R$ 2,50/km',
                    icon: Car,
                    accent: 'border-slate-800 bg-slate-900 text-white',
                    inactive: 'border-slate-200 bg-slate-50 text-slate-800 hover:border-slate-400',
                  },
                  {
                    id: 'confort' as VehicleCategory,
                    title: 'Motorista Confort',
                    desc: 'Carro novo 2020+ (Sedã/SUV)',
                    rate: 'R$ 3,50/km',
                    icon: Sparkles,
                    accent: 'border-[#ff6a00] bg-gradient-to-br from-[#ff6a00] to-orange-600 text-white',
                    inactive: 'border-orange-200 bg-orange-50/50 text-slate-800 hover:border-orange-400',
                  },
                  {
                    id: 'moto_passageiro' as VehicleCategory,
                    title: 'Motoboy Passageiro',
                    desc: 'Moto táxi rápida (150cc+)',
                    rate: 'R$ 1,80/km',
                    icon: Bike,
                    accent: 'border-cyan-600 bg-gradient-to-br from-cyan-600 to-teal-700 text-white',
                    inactive: 'border-cyan-200 bg-cyan-50/50 text-slate-800 hover:border-cyan-400',
                  },
                  {
                    id: 'moto_entrega' as VehicleCategory,
                    title: 'Motoboy Entregas',
                    desc: 'Flash & Delivery até 20kg',
                    rate: 'R$ 2,00/km',
                    icon: Package,
                    accent: 'border-amber-600 bg-gradient-to-br from-amber-600 to-yellow-600 text-white',
                    inactive: 'border-amber-200 bg-amber-50/50 text-slate-800 hover:border-amber-400',
                  },
                ].map((item) => {
                  const Icon = item.icon;
                  const isSelected = regCategory === item.id;
                  return (
                    <button
                      key={item.id}
                      type="button"
                      onClick={() => handleCategoryChange(item.id)}
                      className={`p-4 rounded-2xl border-2 text-left transition-all cursor-pointer relative shadow-xs flex flex-col justify-between gap-3 ${
                        isSelected ? `${item.accent} shadow-md scale-[1.02]` : item.inactive
                      }`}
                    >
                      <div className="flex items-center justify-between">
                        <div className={`w-9 h-9 rounded-xl flex items-center justify-center ${isSelected ? 'bg-white/20 text-white' : 'bg-white text-slate-900 border border-slate-200 shadow-xs'}`}>
                          <Icon className="w-5 h-5" />
                        </div>
                        {isSelected && (
                          <span className="w-5 h-5 rounded-full bg-white text-slate-950 flex items-center justify-center font-bold text-xs shadow-xs">
                            ✓
                          </span>
                        )}
                      </div>
                      <div>
                        <div className="font-heading font-black text-xs sm:text-sm leading-snug">
                          {item.title}
                        </div>
                        <div className={`text-[11px] font-medium leading-tight mt-0.5 ${isSelected ? 'text-white/80' : 'text-slate-600'}`}>
                          {item.desc}
                        </div>
                        <div className={`text-xs font-mono font-black mt-2 inline-block px-2 py-0.5 rounded ${isSelected ? 'bg-black/30 text-white' : 'bg-white text-slate-900 border border-slate-200'}`}>
                          {item.rate}
                        </div>
                      </div>
                    </button>
                  );
                })}
              </div>
            </div>

            {/* PAINEL OFICIAL DE INFORMAÇÕES DA CATEGORIA SELECIONADA */}
            <div className="bg-slate-50 border-2 border-slate-300 rounded-3xl p-5 sm:p-6 space-y-5">
              {/* Banner Topo da Categoria */}
              <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 border-b border-slate-200 pb-4">
                <div>
                  <div className="flex items-center gap-2">
                    <span className="text-xs font-mono font-bold uppercase tracking-wider text-slate-500">
                      Informações Oficiais para Atuação
                    </span>
                    <span className={`text-xs font-heading font-black px-2.5 py-0.5 rounded-full border ${selectedGuide.badgeColor}`}>
                      {selectedGuide.badge}
                    </span>
                  </div>
                  <h4 className="font-heading font-black text-slate-950 text-lg sm:text-xl mt-1">
                    {selectedGuide.title} — {selectedGuide.tagline}
                  </h4>
                </div>

                <div className="bg-white border border-slate-300 rounded-2xl p-3 shrink-0 flex items-center gap-3">
                  <div className="text-right">
                    <span className="text-[10px] uppercase font-bold text-slate-500 block">Tarifa Oficial</span>
                    <span className="text-base sm:text-lg font-heading font-black text-[#ff6a00]">{selectedGuide.pricePerKm}/km</span>
                  </div>
                  <div className="h-8 w-px bg-slate-200" />
                  <div className="text-left">
                    <span className="text-[10px] uppercase font-bold text-slate-500 block">Repasse</span>
                    <span className="text-xs font-heading font-black text-emerald-700">100% Livre</span>
                  </div>
                </div>
              </div>

              {/* 3 Blocos Rápidos: Remuneração, Assinatura e Área */}
              <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
                <div className="bg-white p-4 rounded-2xl border border-slate-200 space-y-1">
                  <div className="flex items-center gap-2 text-emerald-700 font-heading font-black text-xs uppercase">
                    <DollarSign className="w-4 h-4" />
                    <span>Ganhos 100% Livres</span>
                  </div>
                  <p className="text-xs text-slate-700 font-medium">
                    {selectedGuide.earningsDescription}
                  </p>
                </div>

                <div className="bg-white p-4 rounded-2xl border border-slate-200 space-y-1">
                  <div className="flex items-center gap-2 text-[#ff6a00] font-heading font-black text-xs uppercase">
                    <QrCode className="w-4 h-4" />
                    <span>Plano Semanal Fixo</span>
                  </div>
                  <p className="text-xs text-slate-700 font-medium">
                    Apenas <strong>{WEEKLY_FEE_TEXT}</strong> via PIX (<span className="font-mono text-[11px] font-bold text-slate-900">{RACE_PIX_KEY}</span>). Corridas ilimitadas nos 7 dias.
                  </p>
                </div>

                <div className="bg-white p-4 rounded-2xl border border-slate-200 space-y-1">
                  <div className="flex items-center gap-2 text-blue-700 font-heading font-black text-xs uppercase">
                    <Navigation className="w-4 h-4" />
                    <span>Área de Atuação</span>
                  </div>
                  <p className="text-xs text-slate-700 font-medium">
                    Município de <strong>Indaiatuba-SP</strong>: Centro, bairros, distritos industriais e condomínios fechados.
                  </p>
                </div>
              </div>

              {/* 4 Cards Detalhados de Exigências Operacionais */}
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                {/* 1. Atividades Práticas */}
                <div className="bg-white p-4 rounded-2xl border border-slate-200 space-y-2.5">
                  <div className="flex items-center gap-2 text-slate-900 font-heading font-black text-xs uppercase border-b border-slate-100 pb-1.5">
                    <Clock className="w-4 h-4 text-amber-600" />
                    <span>1. Rotina de Atividades na Prática</span>
                  </div>
                  <ul className="space-y-1.5">
                    {selectedGuide.activitiesList.map((item, idx) => (
                      <li key={idx} className="text-xs text-slate-700 flex items-start gap-2">
                        <span className="w-1.5 h-1.5 rounded-full bg-amber-500 mt-1.5 shrink-0" />
                        <span>{item}</span>
                      </li>
                    ))}
                  </ul>
                </div>

                {/* 2. Exigências do Condutor */}
                <div className="bg-white p-4 rounded-2xl border border-slate-200 space-y-2.5">
                  <div className="flex items-center gap-2 text-slate-900 font-heading font-black text-xs uppercase border-b border-slate-100 pb-1.5">
                    <UserCheck className="w-4 h-4 text-emerald-600" />
                    <span>2. Exigências do Condutor (Documentos)</span>
                  </div>
                  <ul className="space-y-1.5">
                    {selectedGuide.driverRequirements.map((item, idx) => (
                      <li key={idx} className="text-xs text-slate-700 flex items-start gap-2">
                        <CheckCircle2 className="w-3.5 h-3.5 text-emerald-600 mt-0.5 shrink-0" />
                        <span>{item}</span>
                      </li>
                    ))}
                  </ul>
                </div>

                {/* 3. Requisitos do Veículo / Moto */}
                <div className="bg-white p-4 rounded-2xl border border-slate-200 space-y-2.5">
                  <div className="flex items-center gap-2 text-slate-900 font-heading font-black text-xs uppercase border-b border-slate-100 pb-1.5">
                    <Car className="w-4 h-4 text-blue-600" />
                    <span>3. Critérios Obrigatórios do Veículo</span>
                  </div>
                  <ul className="space-y-1.5">
                    {selectedGuide.vehicleRequirements.map((item, idx) => (
                      <li key={idx} className="text-xs text-slate-700 flex items-start gap-2">
                        <CheckCircle2 className="w-3.5 h-3.5 text-blue-600 mt-0.5 shrink-0" />
                        <span>{item}</span>
                      </li>
                    ))}
                  </ul>
                </div>

                {/* 4. Equipamentos Obrigatórios */}
                <div className="bg-white p-4 rounded-2xl border border-slate-200 space-y-2.5">
                  <div className="flex items-center gap-2 text-slate-900 font-heading font-black text-xs uppercase border-b border-slate-100 pb-1.5">
                    <ShieldCheck className="w-4 h-4 text-purple-600" />
                    <span>4. Equipamentos Obrigatórios para Rodar</span>
                  </div>
                  <ul className="space-y-1.5">
                    {selectedGuide.mandatoryEquipment.map((item, idx) => (
                      <li key={idx} className="text-xs text-slate-700 flex items-start gap-2">
                        <CheckCircle2 className="w-3.5 h-3.5 text-purple-600 mt-0.5 shrink-0" />
                        <span className="font-medium">{item}</span>
                      </li>
                    ))}
                  </ul>
                </div>
              </div>

              {/* Banner Confort Específico (Regulamento de Modelos 2020+) */}
              {regCategory === 'confort' && (
                <div className="bg-purple-50 border-2 border-purple-200 rounded-2xl p-4 space-y-2">
                  <div className="flex items-center gap-2 text-purple-950 font-heading font-black text-xs uppercase">
                    <Sparkles className="w-4 h-4 text-purple-700" />
                    <span>Regulamento Específico Confort (Ano Mínimo Obrigatório)</span>
                  </div>
                  <p className="text-xs text-purple-950 font-medium">
                    Para manter a nota média e o padrão executivo: <strong>Sedãs Médios e SUVs</strong> (2018+), <strong>Sedãs Populares</strong> como Voyage e Cronos (2019+) e <strong>Compactos Premium</strong> como Polo e Argo (2023+). Regra geral para outros modelos: <strong>2020 ou superior</strong>.
                  </p>
                </div>
              )}
            </div>

            {comfortWarning && (
              <div className="bg-amber-50 border-2 border-amber-300 text-amber-950 text-xs sm:text-sm p-4 rounded-2xl font-bold flex items-center gap-2.5 shadow-sm">
                <AlertTriangle className="w-5 h-5 text-amber-600 shrink-0" />
                <span>{comfortWarning}</span>
              </div>
            )}

            {/* SUCESSO DE CADASTRO */}
            {registeredSuccess ? (
              <div className="bg-emerald-50 border-2 border-emerald-400 rounded-3xl p-6 sm:p-7 text-center space-y-5 shadow-md">
                <div className="w-16 h-16 bg-emerald-100 text-emerald-700 rounded-full flex items-center justify-center mx-auto shadow-inner">
                  <CheckCircle2 className="w-10 h-10" />
                </div>
                <div className="space-y-1">
                  <h4 className="font-heading font-black text-slate-900 text-xl sm:text-2xl">
                    Cadastro de {selectedGuide.title} Criado com Sucesso!
                  </h4>
                  <p className="text-sm sm:text-base text-slate-700 max-w-lg mx-auto font-medium">
                    Suas credenciais de acesso (<strong className="font-mono text-slate-950">{regEmail}</strong>) e dados do veículo foram homologados.
                  </p>
                </div>

                {/* Chave PIX oficial para ativação */}
                <div className="bg-white border-2 border-emerald-300 rounded-2xl p-4 max-w-md mx-auto text-left space-y-2 shadow-xs">
                  <div className="flex items-center justify-between text-xs font-heading font-black text-slate-700">
                    <span>ASSINATURA SEMANAL RACE ({WEEKLY_DAYS} DIAS)</span>
                    <span className="text-emerald-700 font-mono">{WEEKLY_FEE_TEXT}</span>
                  </div>
                  <div className="flex items-center justify-between bg-slate-50 p-2.5 rounded-xl border border-slate-200">
                    <span className="font-mono text-xs font-bold text-slate-900 select-all truncate">
                      {RACE_PIX_KEY}
                    </span>
                    <button
                      type="button"
                      onClick={handleCopyRacePixKey}
                      className="ml-2 px-3 py-1 bg-amber-500 hover:bg-amber-400 text-slate-950 rounded-lg text-xs font-heading font-black flex items-center gap-1 cursor-pointer transition-all shrink-0"
                    >
                      {copiedRacePix ? <Check className="w-3.5 h-3.5 text-emerald-800" /> : <Copy className="w-3.5 h-3.5" />}
                      <span>{copiedRacePix ? 'Copiado!' : 'Copiar'}</span>
                    </button>
                  </div>
                  <p className="text-[11px] text-slate-500 font-medium">
                    Banco: {RACE_PIX_BANK} • Titular: {RACE_PIX_NAME}
                  </p>
                </div>

                <div className="flex flex-col sm:flex-row gap-3 justify-center pt-2">
                  <button
                    type="button"
                    onClick={() => {
                      setRegisteredSuccess(false);
                      setActiveSubTab('subscription');
                    }}
                    className="bg-amber-500 hover:bg-amber-400 text-slate-950 font-heading font-black text-sm sm:text-base px-7 py-3.5 rounded-2xl transition-all cursor-pointer shadow-md border border-amber-400 flex items-center justify-center gap-2 active:scale-95"
                  >
                    <span>VER DETALHES DA ASSINATURA / COMPROVANTE</span>
                    <ArrowRight className="w-5 h-5" />
                  </button>
                  <button
                    type="button"
                    onClick={() => {
                      setRegisteredSuccess(false);
                      setActiveSubTab('dashboard');
                    }}
                    className="bg-white hover:bg-slate-100 text-slate-700 font-bold text-xs sm:text-sm px-5 py-3 rounded-2xl transition-all cursor-pointer border border-slate-300"
                  >
                    Ir para Meu Painel Condutor
                  </button>
                </div>
              </div>
            ) : (
              /* FORMULÁRIO DE CADASTRO ADAPTADO PARA A CATEGORIA */
              <form onSubmit={handleRegisterSubmit} className="space-y-5">
                {regError && (
                  <div className="bg-rose-50 border border-rose-300 text-rose-800 text-sm p-4 rounded-2xl font-bold flex items-center gap-2">
                    <AlertTriangle className="w-5 h-5 text-rose-600 shrink-0" />
                    <span>{regError}</span>
                  </div>
                )}

                {/* Seção 1: Credenciais de Acesso */}
                <div className="bg-slate-50 p-5 rounded-2xl border border-slate-200 space-y-4">
                  <div className="flex items-center gap-2 border-b border-slate-200 pb-2">
                    <Lock className="w-5 h-5 text-amber-700" />
                    <h4 className="font-heading font-black text-slate-950 text-base">
                      1. Dados de Acesso (Login e Senha do Parceiro)
                    </h4>
                  </div>

                  <div className="grid grid-cols-1 sm:grid-cols-3 gap-3.5">
                    <div>
                      <label className="text-xs sm:text-sm font-bold text-slate-700 mb-1 block">
                        Login / E-mail de Acesso *
                      </label>
                      <input
                        type="email"
                        required
                        value={regEmail}
                        onChange={(e) => setRegEmail(e.target.value)}
                        placeholder="seu.email@exemplo.com"
                        className="w-full bg-white border border-slate-300 rounded-xl px-4 py-2.5 text-sm sm:text-base text-slate-950 focus:outline-none focus:border-amber-500 font-medium"
                      />
                    </div>

                    <div>
                      <label className="text-xs sm:text-sm font-bold text-slate-700 mb-1 block">
                        Senha de Acesso (mín. 6 dígitos) *
                      </label>
                      <div className="relative">
                        <input
                          type={showRegPassword ? 'text' : 'password'}
                          required
                          value={regPassword}
                          onChange={(e) => setRegPassword(e.target.value)}
                          placeholder="Crie sua senha segura"
                          className="w-full bg-white border border-slate-300 rounded-xl px-4 py-2.5 text-sm sm:text-base text-slate-950 focus:outline-none focus:border-amber-500 font-medium pr-10"
                        />
                        <button
                          type="button"
                          onClick={() => setShowRegPassword(!showRegPassword)}
                          className="absolute right-3 top-3 text-slate-400 hover:text-slate-800 cursor-pointer"
                        >
                          {showRegPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                        </button>
                      </div>
                    </div>

                    <div>
                      <label className="text-xs sm:text-sm font-bold text-slate-700 mb-1 block">
                        Confirmar Senha *
                      </label>
                      <input
                        type={showRegPassword ? 'text' : 'password'}
                        required
                        value={regConfirmPassword}
                        onChange={(e) => setRegConfirmPassword(e.target.value)}
                        placeholder="Repita sua senha"
                        className="w-full bg-white border border-slate-300 rounded-xl px-4 py-2.5 text-sm sm:text-base text-slate-950 focus:outline-none focus:border-amber-500 font-medium"
                      />
                    </div>
                  </div>
                </div>

                {/* Seção 2: Dados Pessoais & Documentos */}
                <div className="bg-slate-50 p-5 rounded-2xl border border-slate-200 space-y-4">
                  <div className="flex items-center gap-2 border-b border-slate-200 pb-2">
                    <UserCheck className="w-5 h-5 text-amber-700" />
                    <h4 className="font-heading font-black text-slate-950 text-base">
                      2. Dados Pessoais, Habilitação e Recebimento
                    </h4>
                  </div>

                  <div className="grid grid-cols-1 sm:grid-cols-3 gap-3.5">
                    <div>
                      <label className="text-xs sm:text-sm font-bold text-slate-700 mb-1 block">
                        Nome Completo *
                      </label>
                      <input
                        type="text"
                        required
                        value={regName}
                        onChange={(e) => setRegName(e.target.value)}
                        placeholder="Ex: João da Silva"
                        className="w-full bg-white border border-slate-300 rounded-xl px-4 py-2.5 text-sm sm:text-base text-slate-950 focus:outline-none focus:border-amber-500 font-medium"
                      />
                    </div>

                    <div>
                      <label className="text-xs sm:text-sm font-bold text-slate-700 mb-1 block">
                        WhatsApp / Celular com DDD *
                      </label>
                      <input
                        type="tel"
                        required
                        value={regPhone}
                        onChange={(e) => setRegPhone(e.target.value)}
                        placeholder="(19) 98765-4321"
                        className="w-full bg-white border border-slate-300 rounded-xl px-4 py-2.5 text-sm sm:text-base text-slate-950 focus:outline-none focus:border-amber-500 font-medium"
                      />
                    </div>

                    <div>
                      <label className="text-xs sm:text-sm font-bold text-slate-700 mb-1 block">
                        CPF do Titular *
                      </label>
                      <input
                        type="text"
                        required
                        value={regCpf}
                        onChange={(e) => setRegCpf(e.target.value)}
                        placeholder="000.000.000-00"
                        className="w-full bg-white border border-slate-300 rounded-xl px-4 py-2.5 text-sm sm:text-base text-slate-950 focus:outline-none focus:border-amber-500 font-medium"
                      />
                    </div>

                    <div className="sm:col-span-2">
                      <label className="text-xs sm:text-sm font-bold text-slate-700 mb-1 block">
                        Número da CNH (com EAR "Exerce Atividade Remunerada" Ativo) *
                      </label>
                      <input
                        type="text"
                        required
                        value={regCnh}
                        onChange={(e) => setRegCnh(e.target.value)}
                        placeholder={
                          regCategory === 'moto_passageiro' || regCategory === 'moto_entrega'
                            ? 'Ex: 01234567890 - Categoria A (EAR Ativo)'
                            : 'Ex: 01234567890 - Categoria B (EAR Ativo)'
                        }
                        className="w-full bg-white border border-slate-300 rounded-xl px-4 py-2.5 text-sm sm:text-base text-slate-950 focus:outline-none focus:border-amber-500 font-medium"
                      />
                    </div>

                    <div>
                      <label className="text-xs sm:text-sm font-bold text-slate-700 mb-1 block">
                        Sua Chave PIX Pessoal (para receber 100%)
                      </label>
                      <input
                        type="text"
                        value={regPixKey}
                        onChange={(e) => setRegPixKey(e.target.value)}
                        placeholder="CPF, E-mail ou Celular"
                        className="w-full bg-white border border-slate-300 rounded-xl px-4 py-2.5 text-sm sm:text-base text-slate-950 focus:outline-none focus:border-amber-500 font-medium"
                      />
                    </div>
                  </div>
                </div>

                {/* Seção 3: Veículo e Equipamentos da Categoria Selecionada */}
                <div className="bg-slate-50 p-5 rounded-2xl border border-slate-200 space-y-4">
                  <div className="flex items-center justify-between border-b border-slate-200 pb-2">
                    <div className="flex items-center gap-2">
                      <Car className="w-5 h-5 text-amber-700" />
                      <h4 className="font-heading font-black text-slate-950 text-base">
                        3. Dados do Veículo & Equipamentos de {selectedGuide.title}
                      </h4>
                    </div>
                    <span className="text-xs font-mono font-bold text-slate-700 bg-white px-2.5 py-0.5 rounded-full border border-slate-300">
                      Categoria Ativa: {selectedGuide.title}
                    </span>
                  </div>

                  {/* Modelos Sugeridos da Categoria para Seleção Rápida */}
                  {presets.length > 0 && (
                    <div>
                      <label className="text-xs sm:text-sm font-bold text-slate-700 block mb-1.5">
                        Modelos Populares de {selectedGuide.title} (Clique para preencher rápido):
                      </label>
                      <div className="flex flex-wrap gap-2">
                        {presets.map((pm, i) => (
                          <button
                            key={i}
                            type="button"
                            onClick={() => handleSelectPresetModel(pm)}
                            className={`text-xs px-2.5 py-1.5 rounded-lg border font-semibold cursor-pointer transition-all ${
                              regModel === pm.name
                                ? 'bg-slate-900 text-white border-slate-900 shadow-sm'
                                : 'bg-white text-slate-700 border-slate-300 hover:border-amber-500'
                            }`}
                          >
                            {pm.name} {pm.year ? `(${pm.year})` : ''} {pm.highlight ? `• ${pm.highlight}` : ''}
                          </button>
                        ))}
                      </div>
                    </div>
                  )}

                  <div className="grid grid-cols-1 sm:grid-cols-4 gap-3.5">
                    <div className="sm:col-span-2">
                      <label className="text-xs sm:text-sm font-bold text-slate-700 mb-1 block">
                        {regCategory === 'moto_passageiro' || regCategory === 'moto_entrega'
                          ? 'Modelo da Motocicleta (ex: Honda CG 160 Titan) *'
                          : 'Modelo do Veículo (ex: Toyota Corolla / Onix / Argo) *'}
                      </label>
                      <input
                        type="text"
                        required
                        value={regModel}
                        onChange={(e) => setRegModel(e.target.value)}
                        placeholder="Ex: Honda CG 160 / Toyota Corolla / Onix"
                        className="w-full bg-white border border-slate-300 rounded-xl px-4 py-2.5 text-sm sm:text-base text-slate-950 focus:outline-none focus:border-amber-500 font-medium"
                      />
                    </div>

                    <div>
                      <label className="text-xs sm:text-sm font-bold text-slate-700 mb-1 block">
                        Ano de Fabricação *
                      </label>
                      <input
                        type="number"
                        required
                        value={regYear}
                        onChange={(e) => setRegYear(e.target.value)}
                        placeholder="Ex: 2022"
                        className="w-full bg-white border border-slate-300 rounded-xl px-4 py-2.5 text-sm sm:text-base text-slate-950 focus:outline-none focus:border-amber-500 font-medium"
                      />
                    </div>

                    <div>
                      <label className="text-xs sm:text-sm font-bold text-slate-700 mb-1 block">
                        Placa do Veículo *
                      </label>
                      <input
                        type="text"
                        required
                        value={regPlate}
                        onChange={(e) => setRegPlate(e.target.value)}
                        placeholder="ABC-1234 ou Mercosul"
                        className="w-full bg-white border border-slate-300 rounded-xl px-4 py-2.5 text-sm sm:text-base text-slate-950 focus:outline-none focus:border-amber-500 font-medium uppercase"
                      />
                    </div>

                    <div className="sm:col-span-2">
                      <label className="text-xs sm:text-sm font-bold text-slate-700 mb-1 block">
                        Cor Predominante *
                      </label>
                      <input
                        type="text"
                        required
                        value={regColor}
                        onChange={(e) => setRegColor(e.target.value)}
                        placeholder="Ex: Prata, Preto, Branco, Cinza, Vermelho"
                        className="w-full bg-white border border-slate-300 rounded-xl px-4 py-2.5 text-sm sm:text-base text-slate-950 focus:outline-none focus:border-amber-500 font-medium"
                      />
                    </div>

                    {/* Campo Específico para Motoboy de Entregas: Tipo de Baú / Bag */}
                    {regCategory === 'moto_entrega' && (
                      <div className="sm:col-span-2">
                        <label className="text-xs sm:text-sm font-bold text-slate-700 mb-1 block">
                          Tipo de Compartimento de Carga / Baú *
                        </label>
                        <select
                          value={regTrunkType}
                          onChange={(e) => setRegTrunkType(e.target.value)}
                          className="w-full bg-white border border-slate-300 rounded-xl px-4 py-2.5 text-sm sm:text-base text-slate-950 focus:outline-none focus:border-amber-500 font-medium cursor-pointer"
                        >
                          <option value="Baú 80 Litros">Baú Homologado 80 Litros</option>
                          <option value="Baú 90 Litros">Baú Homologado 90 Litros</option>
                          <option value="Baú 120 Litros">Baú Homologado 120 Litros</option>
                          <option value="Mochila / Bag Térmica (até 20kg)">Mochila / Bag Térmica Impermeável (até 20kg)</option>
                        </select>
                      </div>
                    )}
                  </div>

                  {/* Declaração de Equipamento para Motoboy Passageiro */}
                  {regCategory === 'moto_passageiro' && (
                    <div className="bg-cyan-50 border border-cyan-300 rounded-xl p-3.5 flex items-start gap-3">
                      <input
                        type="checkbox"
                        id="helmet_check"
                        checked={regHelmetConfirmed}
                        onChange={(e) => setRegHelmetConfirmed(e.target.checked)}
                        className="mt-1 w-4 h-4 text-cyan-600 rounded border-cyan-400 cursor-pointer"
                      />
                      <label htmlFor="helmet_check" className="text-xs sm:text-sm text-cyan-950 font-medium cursor-pointer">
                        <strong>Declaração Obrigatória:</strong> Confirmo que possuo 2 capacetes regulamentados pelo INMETRO com viseira transparente e selo de segurança, e fornecerei toucas higiênicas descartáveis a cada passageiro transportado.
                      </label>
                    </div>
                  )}

                  {/* Confirmação de Ar-Condicionado para Motoristas */}
                  {(regCategory === 'economica' || regCategory === 'confort') && (
                    <div className="bg-slate-100 border border-slate-300 rounded-xl p-3.5 flex items-start gap-3">
                      <input
                        type="checkbox"
                        id="ac_check"
                        checked={regAcConfirmed}
                        onChange={(e) => setRegAcConfirmed(e.target.checked)}
                        className="mt-1 w-4 h-4 text-amber-600 rounded border-slate-400 cursor-pointer"
                      />
                      <label htmlFor="ac_check" className="text-xs sm:text-sm text-slate-900 font-medium cursor-pointer">
                        <strong>Padrão de Conforto:</strong> Confirmo que meu veículo possui 4 portas, 5 lugares e ar-condicionado em pleno funcionamento para acionamento durante as viagens.
                      </label>
                    </div>
                  )}

                  {/* Validador Visual do Modelo Confort em Tempo Real */}
                  {regCategory === 'confort' && (
                    <div
                      className={`p-4 rounded-2xl border-2 transition-all space-y-1.5 ${
                        comfortCheck.eligible
                          ? 'bg-emerald-50 border-emerald-400 text-emerald-950'
                          : 'bg-amber-50 border-amber-400 text-amber-950'
                      }`}
                    >
                      <div className="flex items-center justify-between">
                        <div className="flex items-center gap-2">
                          {comfortCheck.eligible ? (
                            <CheckCircle2 className="w-5 h-5 text-emerald-600 shrink-0" />
                          ) : (
                            <AlertTriangle className="w-5 h-5 text-amber-600 shrink-0" />
                          )}
                          <span className="font-heading font-black text-sm sm:text-base">
                            {comfortCheck.eligible
                              ? 'VEÍCULO APROVADO PARA O MODELO CONFORT'
                              : 'RESTRIÇÃO DE ANO PARA O MODELO CONFORT'}
                          </span>
                        </div>
                        <span className="text-xs font-mono font-bold px-2 py-0.5 rounded bg-white border shadow-sm">
                          Ano mínimo: {comfortCheck.minYearRequired}+
                        </span>
                      </div>

                      <p className="text-xs sm:text-sm font-medium">
                        {comfortCheck.feedbackMessage}
                      </p>

                      <div className="text-xs text-slate-600 border-t border-slate-200/80 pt-1.5 mt-1">
                        <strong>Critério aplicado:</strong> {comfortCheck.ruleDescription}
                      </div>
                    </div>
                  )}
                </div>

                {/* Selo de Auditoria e Criptografia */}
                <div className="bg-slate-50 p-4 rounded-xl border border-slate-200 flex flex-col sm:flex-row sm:items-center justify-between gap-2 text-xs sm:text-sm text-slate-700 font-medium">
                  <div className="flex items-center gap-2.5">
                    <ShieldCheck className="w-5 h-5 text-emerald-600 shrink-0" />
                    <span>Auditoria automática de antecedentes criminais, dados veiculares e CNH com EAR</span>
                  </div>
                  <span className="text-xs text-emerald-700 font-bold bg-emerald-50 px-2.5 py-0.5 rounded border border-emerald-200 shrink-0">
                    Criptografia Segura
                  </span>
                </div>

                {/* Botão de Finalização com Categoria Específica */}
                <button
                  type="submit"
                  className="w-full bg-[#ff6a00] hover:bg-[#e05e00] text-white font-heading font-black py-4 px-6 rounded-2xl transition-all cursor-pointer shadow-lg shadow-[#ff6a00]/25 text-sm sm:text-base border border-orange-500 uppercase tracking-wider active:scale-[0.99]"
                >
                  FINALIZAR CADASTRO DE {selectedGuide.title.toUpperCase()} & ATIVAR ATIVIDADES ({WEEKLY_FEE_BADGE})
                </button>
              </form>
            )}
          </div>
        );
      })()}

      {/* SUBTAB 4: COMISSÕES & GANHOS (85% MOTORISTA / 15% RACE) */}
      {activeSubTab === 'subscription' && (
        <div className="space-y-4">
          {/* Card Principal do Modelo 85% / 15% */}
          <div className="bg-white border-2 border-slate-200 rounded-3xl p-6 sm:p-7 shadow-lg space-y-6">
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 pb-4 border-b border-slate-200">
              <div>
                <span className="text-xs font-mono font-black uppercase tracking-wider text-emerald-700 bg-emerald-50 px-2.5 py-1 rounded-full border border-emerald-200 inline-block mb-1">
                  NOVO MODELO DE REPASSE RACE
                </span>
                <h2 className="font-heading font-black text-slate-950 text-2xl sm:text-3xl">
                  85% para Você • 15% Race
                </h2>
                <p className="text-xs sm:text-sm text-slate-600 font-medium mt-1">
                  Você não paga nada para trabalhar. Sem mensalidade, sem taxa semanal de R$ 200.
                </p>
              </div>

              <div className="flex flex-col items-start sm:items-end gap-1.5">
                <span className="inline-flex items-center gap-1.5 px-3.5 py-1.5 rounded-full text-xs font-heading font-black tracking-wider uppercase border shadow-xs bg-emerald-100 text-emerald-800 border-emerald-300">
                  <CheckCircle2 className="w-4 h-4 text-emerald-600" />
                  <span>CONTA ATIVA E LIBERADA</span>
                </span>
                <span className="text-xs sm:text-sm font-heading font-bold text-slate-700">
                  Pronto para receber chamados
                </span>
              </div>
            </div>

            {/* Exemplos Práticos de Corridas */}
            <div className="space-y-3">
              <h4 className="font-heading font-black text-slate-900 text-sm uppercase tracking-wider flex items-center gap-2">
                <TrendingUp className="w-4 h-4 text-[#ff6a00]" />
                <span>Simulação Real de Ganhos por Categoria</span>
              </h4>

              <div className="grid grid-cols-1 md:grid-cols-3 gap-3.5">
                {/* Exemplo 1: Motorista Confort */}
                <div className="p-4 bg-orange-50/60 rounded-2xl border border-orange-200 space-y-2">
                  <span className="text-xs font-heading font-black text-[#ff6a00] uppercase block">
                    Motorista Confort
                  </span>
                  <div className="text-xl font-heading font-black text-slate-900">
                    Passageiro paga R$ 11,20
                  </div>
                  <div className="space-y-1 text-xs pt-1 border-t border-orange-200">
                    <p className="font-bold text-emerald-700 flex items-center justify-between">
                      <span>Você recebe (85%):</span>
                      <span className="font-mono text-sm">R$ 9,52</span>
                    </p>
                    <p className="text-slate-600 flex items-center justify-between">
                      <span>Comissão Race (15%):</span>
                      <span className="font-mono">R$ 1,68</span>
                    </p>
                  </div>
                </div>

                {/* Exemplo 2: Motoboy Passageiro */}
                <div className="p-4 bg-cyan-50/60 rounded-2xl border border-cyan-200 space-y-2">
                  <span className="text-xs font-heading font-black text-cyan-700 uppercase block">
                    Motoboy Passageiro
                  </span>
                  <div className="text-xl font-heading font-black text-slate-900">
                    Passageiro paga R$ 6,16
                  </div>
                  <div className="space-y-1 text-xs pt-1 border-t border-cyan-200">
                    <p className="font-bold text-emerald-700 flex items-center justify-between">
                      <span>Você recebe (85%):</span>
                      <span className="font-mono text-sm">R$ 5,24</span>
                    </p>
                    <p className="text-slate-600 flex items-center justify-between">
                      <span>Comissão Race (15%):</span>
                      <span className="font-mono">R$ 0,92</span>
                    </p>
                  </div>
                </div>

                {/* Exemplo 3: Motoboy Entregas */}
                <div className="p-4 bg-amber-50/60 rounded-2xl border border-amber-200 space-y-2">
                  <span className="text-xs font-heading font-black text-amber-700 uppercase block">
                    Motoboy Entregas
                  </span>
                  <div className="text-xl font-heading font-black text-slate-900">
                    Passageiro paga R$ 6,90
                  </div>
                  <div className="space-y-1 text-xs pt-1 border-t border-amber-200">
                    <p className="font-bold text-emerald-700 flex items-center justify-between">
                      <span>Você recebe (85%):</span>
                      <span className="font-mono text-sm">R$ 5,87</span>
                    </p>
                    <p className="text-slate-600 flex items-center justify-between">
                      <span>Comissão Race (15%):</span>
                      <span className="font-mono">R$ 1,03</span>
                    </p>
                  </div>
                </div>
              </div>
            </div>

            {/* Cadastro da Chave PIX do Condutor para Saques */}
            <div className="bg-slate-50 p-5 rounded-2xl border border-slate-200 space-y-3">
              <div className="flex items-center justify-between">
                <label className="text-xs sm:text-sm font-heading font-black text-slate-900 flex items-center gap-2">
                  <Wallet className="w-4 h-4 text-emerald-600" />
                  <span>Sua Chave PIX Cadastrada para Recebimento de Saques</span>
                </label>
                <span className="text-[11px] font-mono font-bold text-emerald-700 bg-emerald-50 px-2 py-0.5 rounded border border-emerald-200">
                  Repasse Direto 85%
                </span>
              </div>
              <p className="text-xs text-slate-600 font-medium">
                Mantenha sua chave PIX atualizada (CPF, telefone, e-mail ou aleatória) para envio dos saques:
              </p>
              <div className="flex flex-col sm:flex-row gap-2">
                <input
                  type="text"
                  value={driverPixKey}
                  onChange={(e) => setDriverPixKey(e.target.value)}
                  placeholder="Ex: 123.456.789-00 ou motorista@banco.com.br"
                  className="flex-1 bg-white border border-slate-300 rounded-xl px-3.5 py-2.5 text-sm font-mono text-slate-800 focus:outline-hidden focus:border-emerald-500 shadow-xs"
                />
                <button
                  type="button"
                  onClick={handleSaveDriverPixKey}
                  className="bg-slate-900 hover:bg-slate-800 text-white font-heading font-black px-5 py-2.5 rounded-xl text-xs sm:text-sm transition-all cursor-pointer shadow-sm flex items-center justify-center gap-1.5"
                >
                  <Check className="w-4 h-4 text-emerald-400" />
                  <span>Salvar Chave PIX</span>
                </button>
              </div>
              {savedDriverPixNotice && (
                <p className="text-xs text-emerald-700 font-bold flex items-center gap-1 animate-fade-in">
                  <CheckCircle2 className="w-4 h-4 text-emerald-600" />
                  <span>Chave PIX salva e vinculada ao seu perfil de condutor com sucesso!</span>
                </p>
              )}
            </div>

            {/* Ação: Ir para Carteira e Saques */}
            <div className="pt-2">
              <button
                type="button"
                onClick={() => {
                  setActiveSubTab('dashboard');
                  setDashboardSection('ganhos');
                }}
                className="w-full bg-[#ff6a00] hover:bg-[#e05e00] active:scale-98 text-white font-heading font-black py-4 px-6 rounded-2xl shadow-xl transition-all cursor-pointer text-base sm:text-lg flex items-center justify-center gap-3"
              >
                <Wallet className="w-6 h-6 text-white" />
                <span>VER MEU SALDO E SOLICITAR SAQUE</span>
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Modal PIX Manual Real de R$ 200/semana com Envio de Comprovante */}
      {isPixModalOpen && (
        <div className="fixed inset-0 z-50 bg-slate-950/75 backdrop-blur-xs flex items-center justify-center p-4 overflow-y-auto animate-fade-in">
          <div className="bg-white rounded-3xl max-w-lg w-full p-6 sm:p-7 shadow-2xl border-2 border-slate-200 space-y-5 my-auto animate-scale-up">
            {/* Modal Header */}
            <div className="flex items-center justify-between pb-3 border-b border-slate-200">
              <div className="flex items-center gap-3">
                <div className="w-11 h-11 rounded-2xl bg-emerald-100 text-emerald-800 flex items-center justify-center border border-emerald-200 shadow-xs">
                  <Wallet className="w-6 h-6" />
                </div>
                <div>
                  <h3 className="font-heading font-black text-slate-950 text-lg sm:text-xl leading-tight">
                    Pague R$200 da semana via PIX
                  </h3>
                  <span className="text-xs font-mono font-bold text-emerald-700 block">
                    Taxa Zero &bull; 100% de Repasse ao Condutor
                  </span>
                </div>
              </div>
              <button
                type="button"
                onClick={() => setIsPixModalOpen(false)}
                className="w-9 h-9 rounded-xl bg-slate-100 hover:bg-slate-200 text-slate-600 flex items-center justify-center cursor-pointer transition-colors"
                title="Fechar"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            {/* Feedback de sucesso após envio */}
            {proofSentSuccessNotice ? (
              <div className="p-5 rounded-2xl bg-emerald-50 border-2 border-emerald-400 text-center space-y-4 animate-fade-in">
                <div className="w-14 h-14 bg-emerald-100 rounded-full flex items-center justify-center mx-auto text-emerald-700">
                  <CheckCircle className="w-8 h-8" />
                </div>
                <div className="space-y-1">
                  <h4 className="font-heading font-black text-emerald-950 text-base sm:text-lg">
                    Comprovante Enviado com Sucesso!
                  </h4>
                  <p className="text-sm text-emerald-900 font-semibold leading-relaxed">
                    {proofSentSuccessNotice}
                  </p>
                </div>
                <div className="p-3 bg-white rounded-xl border border-emerald-200 text-xs text-slate-600 font-medium">
                  Assim que o administrador verificar o depósito de R$ 200,00 na conta, sua liberação de 7 dias será ativada instantaneamente.
                </div>
                <button
                  type="button"
                  onClick={() => setIsPixModalOpen(false)}
                  className="w-full bg-slate-900 hover:bg-slate-800 text-white font-heading font-black py-3 rounded-xl transition-all cursor-pointer text-sm"
                >
                  Entendido / Fechar
                </button>
              </div>
            ) : (
              <div className="space-y-4">
                {/* Dados Oficiais da Conta PIX da Race */}
                <div className="bg-slate-50 border-2 border-slate-200 rounded-2xl p-4 sm:p-5 space-y-3.5">
                  {/* Chave PIX da Race */}
                  <div>
                    <label className="text-xs font-heading font-black text-slate-500 uppercase tracking-wider block mb-1">
                      Chave PIX da Race ({RACE_PIX_KEY_TYPE})
                    </label>
                    <div className="flex items-center gap-2">
                      <div className="flex-1 bg-white border border-slate-300 rounded-xl px-3.5 py-2.5 font-mono font-black text-slate-900 text-sm sm:text-base select-all truncate">
                        {RACE_PIX_KEY}
                      </div>
                      <button
                        type="button"
                        onClick={handleCopyRacePixKey}
                        className="bg-emerald-600 hover:bg-emerald-500 text-white font-heading font-black text-xs px-4 py-2.5 rounded-xl transition-all cursor-pointer shadow flex items-center gap-1.5 shrink-0"
                      >
                        {copiedRacePix ? (
                          <>
                            <Check className="w-4 h-4 text-emerald-200" />
                            <span>COPIADO!</span>
                          </>
                        ) : (
                          <>
                            <Copy className="w-4 h-4" />
                            <span>COPIAR CHAVE</span>
                          </>
                        )}
                      </button>
                    </div>
                  </div>

                  {/* Informações Bancárias */}
                  <div className="grid grid-cols-1 sm:grid-cols-3 gap-2.5 pt-1">
                    <div className="bg-white p-3 rounded-xl border border-slate-200">
                      <span className="text-[11px] font-bold text-slate-500 block uppercase">Banco</span>
                      <span className="text-xs sm:text-sm font-heading font-black text-slate-900 block mt-0.5">
                        {RACE_PIX_BANK}
                      </span>
                    </div>

                    <div className="bg-white p-3 rounded-xl border border-slate-200">
                      <span className="text-[11px] font-bold text-slate-500 block uppercase">Favorecido</span>
                      <span className="text-xs sm:text-sm font-heading font-black text-slate-900 block mt-0.5 truncate">
                        {RACE_PIX_NAME}
                      </span>
                    </div>

                    <div className="bg-emerald-100 p-3 rounded-xl border border-emerald-300 text-emerald-950">
                      <span className="text-[11px] font-bold text-emerald-800 block uppercase">Valor Exato</span>
                      <span className="text-sm sm:text-base font-heading font-black text-emerald-950 block mt-0.5">
                        R$ 200,00
                      </span>
                    </div>
                  </div>
                </div>

                {/* Instrução em texto grande */}
                <div className="bg-amber-50 border-2 border-amber-300 rounded-2xl p-4 sm:p-4.5 space-y-1.5">
                  <span className="text-xs font-mono font-bold text-amber-800 uppercase tracking-wider block">
                    Passo a Passo de Pagamento:
                  </span>
                  <p className="text-sm sm:text-base font-heading font-black text-amber-950 leading-relaxed">
                    1. Abra seu banco &bull; 2. PIX com chave acima &bull; 3. Valor R$200 &bull; 4. Tire print do comprovante &bull; 5. Clique em Já paguei
                  </p>
                </div>

                {/* Input pra colar ID do comprovante ou upload de print */}
                <div className="bg-slate-50 border border-slate-200 rounded-2xl p-4 space-y-3">
                  <div>
                    <label className="text-xs font-heading font-black text-slate-700 uppercase tracking-wider block mb-1">
                      ID ou Código do Comprovante Bancário:
                    </label>
                    <input
                      type="text"
                      value={comprovanteId}
                      onChange={(e) => setComprovanteId(e.target.value)}
                      placeholder="Ex: E18236120202611050938... ou código de autenticação"
                      className="w-full bg-white border border-slate-300 rounded-xl px-3.5 py-2.5 text-xs sm:text-sm font-mono text-slate-900 focus:outline-hidden focus:border-emerald-500"
                    />
                  </div>

                  <div>
                    <label className="text-xs font-heading font-black text-slate-700 uppercase tracking-wider block mb-1">
                      Anexar Print do Comprovante (opcional):
                    </label>
                    <label className="flex items-center justify-center gap-2 p-3 bg-white border-2 border-dashed border-slate-300 rounded-xl cursor-pointer hover:border-emerald-500 hover:bg-emerald-50/40 transition-all text-xs font-bold text-slate-700">
                      <Upload className="w-4 h-4 text-emerald-600" />
                      <span>{comprovanteFileName || 'Selecionar imagem / print do comprovante'}</span>
                      <input
                        type="file"
                        accept="image/*"
                        onChange={handleComprovanteFileChange}
                        className="hidden"
                      />
                    </label>

                    {comprovanteImage && (
                      <div className="mt-2 p-2 bg-white rounded-xl border border-slate-200 flex items-center gap-3">
                        <img
                          src={comprovanteImage}
                          alt="Prévia Comprovante"
                          className="w-12 h-12 object-cover rounded-lg border border-slate-300"
                        />
                        <div className="text-xs text-slate-700">
                          <span className="font-bold block truncate max-w-[200px]">{comprovanteFileName}</span>
                          <span className="text-emerald-700 font-semibold text-[11px]">Print anexado com sucesso</span>
                        </div>
                      </div>
                    )}
                  </div>
                </div>

                {/* Botão "Já paguei R$200 - Liberar acesso" */}
                <div className="space-y-2 pt-1">
                  <button
                    type="button"
                    onClick={handleSubmitProofOfPayment}
                    disabled={isSubmittingProof}
                    className="w-full bg-emerald-600 hover:bg-emerald-500 active:scale-98 text-white font-heading font-black py-4 px-4 rounded-xl shadow-lg transition-all cursor-pointer text-sm sm:text-base flex items-center justify-center gap-2"
                  >
                    {isSubmittingProof ? (
                      <>
                        <Loader2 className="w-5 h-5 animate-spin" />
                        <span>Enviando Comprovante...</span>
                      </>
                    ) : (
                      <>
                        <CheckCircle2 className="w-5 h-5 text-emerald-200" />
                        <span>Já paguei R$200 - Liberar acesso</span>
                      </>
                    )}
                  </button>

                  <button
                    type="button"
                    onClick={() => setIsPixModalOpen(false)}
                    className="w-full bg-slate-100 hover:bg-slate-200 text-slate-700 font-heading font-bold py-2.5 px-4 rounded-xl text-xs sm:text-sm transition-all cursor-pointer"
                  >
                    Fechar
                  </button>
                </div>
              </div>
            )}
          </div>
        </div>
      )}

      {/* Modal de Navegação GPS estilo Waze / Uber Driver para o Condutor */}
      {isDriverGpsOpen && (
        <DriverGpsNavigationModal
          driver={currentDriver}
          onClose={() => setIsDriverGpsOpen(false)}
          onCompleteRide={() => {
            onUpdateDriver({
              ...currentDriver,
              earningsToday: currentDriver.earningsToday + 28.5,
              earningsWeek: currentDriver.earningsWeek + 28.5,
              totalRides: currentDriver.totalRides + 1,
            });
            setIsDriverGpsOpen(false);
          }}
        />
      )}
    </div>
  );
};
