import React, { useState, useRef, useEffect } from 'react';
import { Driver, Ride, VehicleCategory, PendingPayment, AppUser, UserRole, UserTipo } from '../types';
import { formatBRL, WEEKLY_SUBSCRIPTION_PRICE, generateUniqueRideConfirmationCode } from '../services/pricingService';
import { saveUserAccount, verifyUserLogin, verifyUserLoginAsync, saveSessionUser } from '../services/userService';
import { savePagamentoSupabase, getPagamentosSupabase, getSearchingCorridasSupabase, getCorridaByIdSupabase, fetchRideCounterpartProfileSupabase, acceptCorridaSupabase, updateCorridaStatusSupabase, updateDriverOnlineStatusSupabase, subscribeToCorridasRealtime, normalizeRideCategory, isRidePaidOrConfirmedCash, isDeliveryRideCompleteForDriver, reportPassengerCashNonPaymentSupabase, saveUsuarioSupabase, hydrateRidesWithUserPhotosSupabase, fetchUsuarioPhotoByIdentity, checkDuplicateRegistrationSupabase, saveDriverApplicationSupabase, fetchDriverApplicationsSupabase, mergeDriverWithApplication, uploadProfilePhotoSupabase, extractPhotoFromRow, getUsuarioSupabase, checkAndAwardReferralBonusSupabase, getDriverReferralsAndBonusesSupabase, syncDriverWalletSaldoSupabase, ensureUserReferralCodeSupabase, ReferralCandidateItem, SupabasePagamentoRow, supabase, withPhotoCacheBuster } from '../supabase';
import {
  isDriverInLaunchZeroFeePromo,
  calculateRideSplitForDriver,
  LAUNCH_PROMO_EARNINGS_BADGE_TEXT,
  buildReferralLink,
  buildReferralWhatsappShareText,
  buildReferralWhatsappShareUrl,
  getLaunchPromoCountdownText,
  normalizeReferralDigits,
  parseReferralBonusMeta,
  formatReferralBonusMessage,
  REFERRAL_REQUIRED_RIDES,
  REFERRAL_BONUS_AMOUNT,
} from '../services/promoService';
import { compressImageToMax200KB, validateAndCompressPhotoFile, validatePhotoMax2MB } from '../utils/imageCompression';
import { isValidEmail, isValidPassword, isValidWhatsApp11 } from '../utils/security';
import { notifyNewIncomingRide } from '../services/audioNotificationService';
import { ForgotPasswordModal } from './ForgotPasswordModal';
import { DriverWorkSelectionView } from './DriverWorkSelectionView';
import { LaunchPromoBanner } from './LaunchPromoBanner';
import { LegalConsentSection } from './LegalConsentSection';
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
    tagline: 'Automóvel a partir de 2015 (até 10 anos de uso)',
    badge: 'R$ 2,50/km • 85% para Você',
    badgeColor: 'bg-zinc-800 text-zinc-200 border-zinc-700',
    pricePerKm: 'R$ 2,50',
    earningsDescription: 'Você fica com 85% de cada corrida, Race fica com 15% - sem mensalidade, sem taxa para trabalhar.',
    activitiesList: [
      'Atendimento a chamados diários no Centro, bairros e condomínios de Indaiatuba.',
      'Transporte individual ou familiar de passageiros (trabalho, compras, compromissos).',
      'Liberdade total para definir seus horários de início e parada sem metas obrigatórias.',
      'Recebimento garantido de 85% via PIX toda sexta-feira ou direto em dinheiro.',
    ],
    driverRequirements: [
      'CNH B válida, sem suspensão',
      'CRLV do veículo em dia',
      'Seguro obrigatório',
    ],
    vehicleRequirements: [
      'Automóvel a partir de 2015 (até 10 anos de uso)',
      'Carro com 4 portas, ar-condicionado funcionando',
      'Veículo em bom estado, sem amassados grandes',
      'Carro limpo, com cinto de segurança para todos os passageiros',
    ],
    mandatoryEquipment: [
      'Foto do carro (4 lados), Foto da CNH e Foto do CRLV',
      'Cinto de segurança funcional para todos os passageiros',
      'Ar-condicionado funcionando em todas as corridas',
    ],
  },
  confort: {
    id: 'confort',
    title: 'Motorista Confort',
    tagline: 'SUV, Sedã ou Hatch Premium a partir de 2020 (até 5 anos de uso)',
    badge: 'R$ 3,50/km • Carro 2020+',
    badgeColor: 'bg-[#ff6a00]/20 text-[#ff6a00] border-[#ff6a00]/40',
    pricePerKm: 'R$ 3,50',
    earningsDescription: 'Tarifa valorizada de R$ 3,50/km com 85% para você e 15% para a Race - sem mensalidade, sem taxa para trabalhar.',
    activitiesList: [
      'Atendimento executivo em Indaiatuba, hotéis, condomínios e centro empresarial.',
      'Passageiros que prezam por conforto superior, ar-condicionado e pontualidade.',
      'Viagens de maior ticket médio e remuneração diferenciada.',
    ],
    driverRequirements: [
      'CNH B válida, sem pontos',
      'CRLV em dia, Seguro total',
      'Avaliação mínima 4.8 para continuar no Confort',
    ],
    vehicleRequirements: [
      'Automóvel a partir de 2020 (até 5 anos de uso)',
      'SUV, Sedã, ou Hatch Premium - ex: Corolla, Honda Civic, T-Cross, Creta, Compass, Nivus, Virtus, Onix Plus',
      'NÃO aceita carro popular 1.0 básico',
      'Ar-condicionado, vidro elétrico, direção hidráulica',
      'Carro impecável, sem riscos, limpo, com cheirinho',
    ],
    mandatoryEquipment: [
      'Foto do carro, Foto CNH e Foto CRLV',
      'Ar-condicionado, vidro elétrico e direção hidráulica em perfeito estado',
    ],
  },
  moto_passageiro: {
    id: 'moto_passageiro',
    title: 'Motoboy Passageiro',
    tagline: 'Moto a partir de 2018 (até 8 anos de uso), mínimo 150cc',
    badge: 'R$ 1,80/km • Velocidade no Trânsito',
    badgeColor: 'bg-cyan-100 text-cyan-900 border-cyan-300',
    pricePerKm: 'R$ 1,80',
    earningsDescription: 'Você fica com 85% de cada corrida e a Race com 15% - sem mensalidade.',
    activitiesList: [
      'Transporte individual ágil de passageiros em Indaiatuba.',
      'Agilidade no trânsito nos horários de pico.',
      'Repasse toda sexta-feira de 85% na sua chave PIX.',
    ],
    driverRequirements: [
      'CNH A válida',
      'CRLV da moto em dia',
      'Seguro obrigatório',
    ],
    vehicleRequirements: [
      'Moto a partir de 2018 (até 8 anos de uso), mínimo 150cc - ex: Honda CG 160, Yamaha Fazer 250, Honda CB 300',
      'Baú ou alça para passageiro segurar',
    ],
    mandatoryEquipment: [
      'Capacete extra para passageiro, limpo, com viseira',
      'Jaqueta, luvas e capa de chuva',
      'Foto da moto, Foto CNH A e Foto CRLV',
    ],
  },
  moto_entrega: {
    id: 'moto_entrega',
    title: 'Motoboy Entregas',
    tagline: 'Moto a partir de 2015, mínimo 125cc, com baú mínimo 90L',
    badge: 'R$ 2,00/km • Encomendas Flash',
    badgeColor: 'bg-amber-100 text-amber-900 border-amber-300',
    pricePerKm: 'R$ 2,00',
    earningsDescription: 'Você fica com 85% de cada entrega e a Race com 15% - sem mensalidade, sem taxa para trabalhar.',
    activitiesList: [
      'Coleta e entrega expressa ponto a ponto de pacotes, documentos e compras em Indaiatuba.',
      'Sem transporte de passageiros: foco total na entrega com baú fixo.',
      'Confirmação segura com código de 4 dígitos.',
    ],
    driverRequirements: [
      'CNH A válida',
      'CRLV em dia',
    ],
    vehicleRequirements: [
      'Moto a partir de 2015, mínimo 125cc',
      'Baú de entregas com no mínimo 90L, fixo, com trava, higienizado',
    ],
    mandatoryEquipment: [
      'Celular com suporte para moto',
      'Foto da moto com baú e Foto CNH A',
    ],
  },
};

const CATEGORY_PRESETS: Record<VehicleCategory, { name: string; year: string; highlight?: string }[]> = {
  economica: [
    { name: 'Chevrolet Onix', year: '2020', highlight: 'Econômico 2015+' },
    { name: 'Fiat Argo', year: '2021', highlight: 'Econômico 2015+' },
    { name: 'Hyundai HB20', year: '2019', highlight: 'Econômico 2015+' },
    { name: 'Renault Kwid', year: '2020', highlight: 'Popular 2015+' },
    { name: 'VW Gol 1.0', year: '2018', highlight: 'Popular 2015+' },
  ],
  confort: [
    { name: 'Toyota Corolla', year: '2022', highlight: 'Sedã 2020+' },
    { name: 'Honda Civic', year: '2022', highlight: 'Sedã 2020+' },
    { name: 'VW T-Cross', year: '2022', highlight: 'SUV 2020+' },
    { name: 'Hyundai Creta', year: '2022', highlight: 'SUV 2020+' },
    { name: 'Jeep Compass', year: '2022', highlight: 'SUV 2020+' },
    { name: 'VW Nivus', year: '2022', highlight: 'SUV 2020+' },
    { name: 'VW Virtus', year: '2021', highlight: 'Sedã 2020+' },
    { name: 'Chevrolet Onix Plus', year: '2022', highlight: 'Sedã 2020+' },
  ],
  moto_passageiro: [
    { name: 'Honda CG 160', year: '2022', highlight: '160cc 2018+' },
    { name: 'Yamaha Fazer 250', year: '2023', highlight: '250cc 2018+' },
    { name: 'Honda CB 300', year: '2023', highlight: '300cc 2018+' },
  ],
  moto_entrega: [
    { name: 'Honda CG 160 Start', year: '2021', highlight: '160cc • Baú 90L+' },
    { name: 'Honda Biz 125', year: '2020', highlight: '125cc • Baú 90L+' },
    { name: 'Yamaha Factor 150', year: '2021', highlight: '150cc • Baú 90L+' },
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
  XCircle,
  User,
  Pencil,
  Gift,
  Users,
  MessageCircle
} from 'lucide-react';
import confetti from 'canvas-confetti';
import { DriverGpsNavigationModal } from './DriverGpsNavigationModal';
import { 
  getDriverBalance, 
  setDriverBalance,
  addDriverEarnings,
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
  onUpdateUserProfile?: (user: AppUser) => void;
  onRegisterDriver: (newDriver: Driver) => void;
  onLoginDriverSuccess?: (user: AppUser, driver?: Driver) => void;
  onAcceptIncomingRide?: (ride: Ride) => void;
  onOpenSupport: () => void;
  onOpenShare?: () => void;
  onOpenPrivacyPage?: () => void;
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
  onUpdateUserProfile,
  onRegisterDriver,
  onLoginDriverSuccess,
  onAcceptIncomingRide,
  onOpenSupport,
  onOpenShare,
  onOpenPrivacyPage,
  onNavigateToRides,
  onShowSubscriptionExpiredModal,
  onRenewWeeklyPlan,
  onTriggerToast,
}) => {
  const [activeSubTab, setActiveSubTab] = useState<'dashboard' | 'login' | 'register' | 'subscription'>('dashboard');
  const [dashboardSection, setDashboardSection] = useState<'corridas' | 'ganhos' | 'indicar' | 'assinatura' | 'perfil'>('corridas');
  const [isOnline, setIsOnline] = useState(currentDriver.status === 'online');
  const [acceptedRideNotice, setAcceptedRideNotice] = useState<string | null>(null);
  const [comfortWarning, setComfortWarning] = useState<string | null>(null);
  const [isDriverGpsOpen, setIsDriverGpsOpen] = useState(false);
  const [acceptedDriverRide, setAcceptedDriverRide] = useState<Ride | null>(null);
  const [cloudSearchingRide, setCloudSearchingRide] = useState<Ride | null>(null);
  const [simulatedRideCode] = useState<string>(() => generateUniqueRideConfirmationCode());
  const [isForgotPasswordOpen, setIsForgotPasswordOpen] = useState(false);
  const [isEditingCategory, setIsEditingCategory] = useState(false);

  const approvalStatus = currentDriver.approvalStatus || 'pendente';
  const isApprovedDriver = approvalStatus === 'aprovado';
  const [onlineBlockNotice, setOnlineBlockNotice] = useState<string | null>(null);

  const isDocumentsAccepted =
    currentDriver.documentosAceitos === true ||
    (currentDriver.documentosAceitos !== false && currentDriver.requirementsConfirmed === true);

  const isCategoryConfigured = Boolean(
    currentDriver.categoryConfigured !== false &&
    currentDriver.vehiclePlate?.trim() &&
    currentDriver.vehicleModel?.trim() &&
    currentDriver.requirementsConfirmed === true &&
    isDocumentsAccepted
  );

  const [dismissedTick, setDismissedTick] = useState(0);
  const dismissedRideIdsRef = useRef<Set<string>>(new Set());
  const announcedRideIdsRef = useRef<Set<string>>(new Set());

  useEffect(() => {
    setIsOnline(isCategoryConfigured && isDocumentsAccepted && isApprovedDriver && currentDriver.status === 'online');
    if (isApprovedDriver && isDocumentsAccepted) {
      setOnlineBlockNotice(null);
    }
  }, [currentDriver.status, isCategoryConfigured, isDocumentsAccepted, isApprovedDriver]);

  // Ouvindo em tempo real via Supabase Realtime ('corridas') + fallback polling 3s enquanto o condutor está ONLINE
  const isSearchingRideStatus = (st?: string) => {
    const s = String(st || '').toLowerCase();
    return s === 'procurando' || s === 'searching' || s === 'procurando_motorista';
  };

  const getRideUniqueKey = (r: Ride) =>
    r.id ? String(r.id) : `${r.passengerName || ''}-${r.pickup?.address || ''}-${r.price || 0}`;

  const doesRideMatchDriverCategory = (r: Ride) => {
    if (!isCategoryConfigured || !currentDriver?.category) return false;
    return normalizeRideCategory(r.category) === normalizeRideCategory(currentDriver.category);
  };

  useEffect(() => {
    if (!isOnline || !isCategoryConfigured || !isApprovedDriver || acceptedDriverRide) {
      if (!isOnline || !isCategoryConfigured || !isApprovedDriver) setCloudSearchingRide(null);
      return;
    }
    let mounted = true;

    const handleNewOrFoundRide = (candidate: Ride | null) => {
      if (!mounted || !candidate) return;
      if (!isSearchingRideStatus(candidate.status)) return;
      if (!isRidePaidOrConfirmedCash(candidate)) return;
      if (!doesRideMatchDriverCategory(candidate)) return;
      if (!isDeliveryRideCompleteForDriver(candidate)) return;
      const key = getRideUniqueKey(candidate);
      if (dismissedRideIdsRef.current.has(key)) return;

      setCloudSearchingRide(candidate);

      if (!announcedRideIdsRef.current.has(key)) {
        announcedRideIdsRef.current.add(key);
        notifyNewIncomingRide();
      }
    };

    const unsubscribeRealtime = subscribeToCorridasRealtime({
      onInsert: (newRide) => {
        handleNewOrFoundRide(newRide);
      },
      onUpdate: (updRide) => {
        if (!mounted) return;
        if (isSearchingRideStatus(updRide.status)) {
          handleNewOrFoundRide(updRide);
          return;
        }
        setCloudSearchingRide((curr) => {
          if (!curr) return null;
          if (curr.id && updRide.id && String(curr.id) === String(updRide.id)) {
            return null;
          }
          return curr;
        });
      },
    });

    const fetchSearching = async () => {
      try {
        const list = await getSearchingCorridasSupabase();
        if (!mounted) return;
        const firstOpen =
          list.find(
            (r) =>
              isSearchingRideStatus(r.status) &&
              isRidePaidOrConfirmedCash(r) &&
              doesRideMatchDriverCategory(r) &&
              isDeliveryRideCompleteForDriver(r) &&
              !dismissedRideIdsRef.current.has(getRideUniqueKey(r))
          ) || null;
        if (firstOpen) {
          handleNewOrFoundRide(firstOpen);
        } else {
          setCloudSearchingRide(null);
        }
      } catch {}
    };

    fetchSearching();
    const timer = setInterval(fetchSearching, 3000);
    return () => {
      mounted = false;
      unsubscribeRealtime();
      clearInterval(timer);
    };
  }, [isOnline, isCategoryConfigured, isApprovedDriver, acceptedDriverRide, currentDriver.category, dismissedTick]);

  // Escuta cancelamento em tempo real pelo passageiro enquanto o motorista está com corrida aceita
  useEffect(() => {
    if (!acceptedDriverRide?.id) return;
    let mounted = true;
    const targetId = String(acceptedDriverRide.id);

    const handleCancelled = (st?: string) => {
      const lower = String(st || '').toLowerCase();
      if (lower === 'cancelled' || lower === 'cancelada') {
        setIsDriverGpsOpen(false);
        setAcceptedDriverRide(null);
        setAcceptedRideNotice('Corrida cancelada pelo passageiro.');
      }
    };

    const unsubscribe = subscribeToCorridasRealtime({
      onUpdate: (updRide) => {
        if (!mounted || !updRide?.id) return;
        if (String(updRide.id) === targetId) {
          handleCancelled(updRide.status);
        }
      },
    });

    const pollTimer = setInterval(async () => {
      try {
        if (!/^\d+$/.test(targetId)) return;
        const latest = await getCorridaByIdSupabase(targetId);
        if (mounted && latest) {
          handleCancelled(latest.status);
        }
      } catch {}
    }, 3500);

    return () => {
      mounted = false;
      unsubscribe();
      clearInterval(pollTimer);
    };
  }, [acceptedDriverRide?.id]);

  // Carrega automaticamente foto do motorista e do passageiro direto do Supabase se estiverem vazias na chamada
  useEffect(() => {
    if (!currentDriver.avatar && (currentDriver.email || currentDriver.id)) {
      fetchUsuarioPhotoByIdentity({ id: currentDriver.id, email: currentDriver.email })
        .then((prof) => {
          if (prof?.avatar) {
            onUpdateDriver({ ...currentDriver, avatar: prof.avatar });
          }
        })
        .catch(() => {});
    }
  }, [currentDriver.id, currentDriver.email, currentDriver.avatar]);

  // Reset isolado de chamadas quando troca o motorista logado
  useEffect(() => {
    setAcceptedDriverRide(null);
    setCloudSearchingRide(null);
    setAcceptedRideNotice(null);
    setIsDriverGpsOpen(false);
    dismissedRideIdsRef.current.clear();
    announcedRideIdsRef.current.clear();
  }, [currentDriver.id, currentDriver.email]);

  // Hidrata foto do passageiro SOMENTE depois que o motorista aceitou a corrida (nunca antes do aceite)
  useEffect(() => {
    if (!acceptedDriverRide || acceptedDriverRide.passengerAvatar) return;
    let mounted = true;
    hydrateRidesWithUserPhotosSupabase([acceptedDriverRide])
      .then(([hydrated]) => {
        if (!mounted || !hydrated?.passengerAvatar) return;
        setAcceptedDriverRide((curr) =>
          curr && curr.id === acceptedDriverRide.id
            ? {
                ...curr,
                passengerAvatar: hydrated.passengerAvatar,
                passengerName: hydrated.passengerName || curr.passengerName,
                passengerPhone: hydrated.passengerPhone || curr.passengerPhone,
              }
            : curr
        );
      })
      .catch(() => {});
    return () => {
      mounted = false;
    };
  }, [acceptedDriverRide]);

  // Galeria de Fotos: Perfil, CNH e Foto do Veículo
  const driverAvatarInputRef = useRef<HTMLInputElement>(null);
  const cnhDocInputRef = useRef<HTMLInputElement>(null);
  const vehicleDocInputRef = useRef<HTMLInputElement>(null);

  const [cnhDocPreview, setCnhDocPreview] = useState<string | null>(null);
  const [vehicleDocPreview, setVehicleDocPreview] = useState<string | null>(null);

  const [isEditingDriverProfile, setIsEditingDriverProfile] = useState(false);
  const [draftDriverName, setDraftDriverName] = useState<string>(currentDriver.name || '');
  const [draftDriverEmail, setDraftDriverEmail] = useState<string>(currentDriver.email || '');
  const [draftDriverPhone, setDraftDriverPhone] = useState<string>(currentDriver.phone || '');
  const [draftDriverAvatar, setDraftDriverAvatar] = useState<string>(
    currentDriver.avatar || currentUser?.avatar || ''
  );
  const [pendingDriverPhotoFile, setPendingDriverPhotoFile] = useState<File | null>(null);
  const [hasPendingDriverAvatar, setHasPendingDriverAvatar] = useState(false);
  const [isSavingDriverProfile, setIsSavingDriverProfile] = useState(false);
  const [driverProfileSuccessMsg, setDriverProfileSuccessMsg] = useState<string | null>(null);
  const [driverProfileErrorMsg, setDriverProfileErrorMsg] = useState<string | null>(null);

  useEffect(() => {
    if (!isEditingDriverProfile && !hasPendingDriverAvatar) {
      setDraftDriverName(currentDriver.name || '');
      setDraftDriverEmail(currentDriver.email || '');
      setDraftDriverPhone(currentDriver.phone || '');
      setDraftDriverAvatar(currentDriver.avatar || currentUser?.avatar || '');
      setPendingDriverPhotoFile(null);
    }
  }, [
    currentDriver.name,
    currentDriver.email,
    currentDriver.phone,
    currentDriver.avatar,
    currentUser?.avatar,
    isEditingDriverProfile,
    hasPendingDriverAvatar,
  ]);

  useEffect(() => {
    let active = true;
    const loadDriverPhotoFromSupabase = async () => {
      try {
        const { data: authData } = await supabase.auth.getUser();
        const authUser = authData?.user;
        const targetEmail = String(currentDriver.email || currentUser?.email || authUser?.email || '')
          .trim()
          .toLowerCase();
        if (!targetEmail) return;

        let row: any = null;
        try {
          const { data } = await supabase
            .from('usuarios')
            .select('foto, avatar')
            .eq('email', targetEmail)
            .single();
          row = data;
        } catch {}

        if (!row) {
          try {
            row = await getUsuarioSupabase(targetEmail);
          } catch {}
        }

        const rawFoto = String(
          row?.avatar ||
            row?.foto ||
            authUser?.user_metadata?.avatar_url ||
            authUser?.user_metadata?.foto ||
            currentDriver.avatar ||
            currentUser?.avatar ||
            ''
        ).trim();

        const fotoUrl = rawFoto ? withPhotoCacheBuster(rawFoto) : '';
        console.log('fotoUrl carregada:', fotoUrl);

        if (!active || !fotoUrl || hasPendingDriverAvatar) return;

        if (!isEditingDriverProfile) {
          setDraftDriverAvatar(fotoUrl);
        }
        if (fotoUrl !== currentDriver.avatar) {
          onUpdateDriver({ ...currentDriver, avatar: fotoUrl });
        }
        if (currentUser && fotoUrl !== currentUser.avatar && onUpdateUserProfile) {
          const syncedUser: AppUser = {
            ...currentUser,
            avatar: fotoUrl,
            driverData: { ...currentDriver, avatar: fotoUrl },
          };
          saveSessionUser(syncedUser);
          onUpdateUserProfile(syncedUser);
        }
      } catch (err) {
        console.log('fotoUrl carregada (motorista): erro ao consultar usuarios', err);
      }
    };

    loadDriverPhotoFromSupabase();
    return () => {
      active = false;
    };
  }, [currentDriver.email, currentUser?.email]);

  const handleOpenDriverProfileEdit = () => {
    setDraftDriverName(currentDriver.name || '');
    setDraftDriverEmail(currentDriver.email || '');
    setDraftDriverPhone(currentDriver.phone || '');
    setDraftDriverAvatar(currentDriver.avatar || currentUser?.avatar || '');
    setPendingDriverPhotoFile(null);
    setHasPendingDriverAvatar(false);
    setDriverProfileErrorMsg(null);
    setDriverProfileSuccessMsg(null);
    setDashboardSection('perfil');
    setIsEditingDriverProfile(true);
  };

  const handleCancelDriverProfileEdit = () => {
    setDraftDriverName(currentDriver.name || '');
    setDraftDriverEmail(currentDriver.email || '');
    setDraftDriverPhone(currentDriver.phone || '');
    setDraftDriverAvatar(currentDriver.avatar || currentUser?.avatar || '');
    setPendingDriverPhotoFile(null);
    setHasPendingDriverAvatar(false);
    setDriverProfileErrorMsg(null);
    setIsEditingDriverProfile(false);
  };

  const handleDriverAvatarUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    const sizeErr = validatePhotoMax2MB(file);
    if (sizeErr) {
      setDriverProfileErrorMsg(sizeErr);
      setDriverProfileSuccessMsg(null);
      setDashboardSection('perfil');
      if (e.target) e.target.value = '';
      return;
    }

    try {
      const { dataUrl } = await validateAndCompressPhotoFile(file);
      if (dataUrl) {
        // Mostra prévia da foto nova na hora no círculo e no editor antes de salvar
        setDraftDriverAvatar(dataUrl);
        setPendingDriverPhotoFile(file);
        setHasPendingDriverAvatar(true);
        setDriverProfileErrorMsg(null);
        setDriverProfileSuccessMsg(null);
        setDashboardSection('perfil');
        setIsEditingDriverProfile(true);
      }
    } catch (err: any) {
      console.log('Erro ao comprimir foto do motorista:', err);
      setDriverProfileErrorMsg(err?.message || 'Não foi possível processar a imagem escolhida.');
    } finally {
      if (e.target) {
        e.target.value = '';
      }
    }
  };

  const handleSaveDriverProfileChanges = async (e?: React.FormEvent) => {
    if (e) e.preventDefault();
    const cleanName = draftDriverName.trim();
    const cleanEmail = draftDriverEmail.trim().toLowerCase();
    const cleanPhone = draftDriverPhone.trim();

    if (!cleanName) {
      setDriverProfileErrorMsg('Informe seu nome completo.');
      return;
    }
    if (!cleanEmail || !cleanEmail.includes('@')) {
      setDriverProfileErrorMsg('Informe um e-mail válido.');
      return;
    }

    setIsSavingDriverProfile(true);
    setDriverProfileErrorMsg(null);
    setDriverProfileSuccessMsg(null);

    try {
      const isChangingPhoto = Boolean(hasPendingDriverAvatar || pendingDriverPhotoFile);
      let photoToSave = draftDriverAvatar || currentDriver.avatar || currentUser?.avatar || '';
      let storageErrorDetail = '';

      if (photoToSave && (pendingDriverPhotoFile || photoToSave.startsWith('data:image'))) {
        const uploadRes = await uploadProfilePhotoSupabase({
          photo: pendingDriverPhotoFile || photoToSave,
          identifier: cleanEmail || currentDriver.id || currentUser?.id || 'motorista',
        });
        if (!uploadRes.url && uploadRes.error) {
          setDriverProfileErrorMsg(uploadRes.error);
          return;
        }
        if (!uploadRes.storageUploaded && uploadRes.error) {
          storageErrorDetail = uploadRes.error;
        }
        photoToSave = uploadRes.url || uploadRes.compressedDataUrl || photoToSave;
      }

      const res = await saveUsuarioSupabase({
        id: currentDriver.id || currentUser?.id,
        previousEmail: currentDriver.email || currentUser?.email,
        nome: cleanName,
        email: cleanEmail,
        celular: cleanPhone,
        whatsapp: cleanPhone,
        login: currentUser?.login || currentDriver.email || cleanEmail,
        tipo: currentUser?.tipo,
        categoria: currentDriver.category,
        placa: currentDriver.vehiclePlate,
        modelo: currentDriver.vehicleModel,
        ano: currentDriver.vehicleYear,
        cnh: currentDriver.cnh,
        foto: photoToSave || undefined,
        avatar: photoToSave || undefined,
      });

      if (!res.success) {
        const combinedError = storageErrorDetail
          ? `Storage: ${storageErrorDetail} | Banco: ${res.error || 'Erro ao salvar alterações.'}`
          : res.error || 'Erro ao salvar alterações no Supabase. Tente novamente.';
        setDriverProfileErrorMsg(combinedError);
        return;
      }

      const returnedPhotoRaw = extractPhotoFromRow(res.data) || photoToSave || '';
      if (isChangingPhoto && !returnedPhotoRaw) {
        setDriverProfileErrorMsg(
          storageErrorDetail
            ? `Erro no upload da foto (${storageErrorDetail}). Verifique as políticas do Storage e tente novamente.`
            : 'A foto não pôde ser salva no servidor. Verifique as permissões de Storage e RLS.'
        );
        return;
      }

      if (returnedPhotoRaw) {
        try {
          await supabase.auth.updateUser({
            data: {
              avatar_url: returnedPhotoRaw,
              foto: returnedPhotoRaw,
            },
          });
        } catch {}
      }

      const fotoUrlBusted = returnedPhotoRaw ? withPhotoCacheBuster(returnedPhotoRaw) : '';
      console.log('fotoUrl carregada:', fotoUrlBusted);

      const updatedDriver: Driver = {
        ...currentDriver,
        name: cleanName,
        email: cleanEmail,
        phone: cleanPhone,
        avatar: fotoUrlBusted,
      };
      onUpdateDriver(updatedDriver);

      if (currentUser) {
        const updatedUser: AppUser = {
          ...currentUser,
          id: res.data?.id ? String(res.data.id) : currentUser.id,
          name: cleanName,
          email: cleanEmail,
          phone: cleanPhone,
          whatsapp: cleanPhone,
          avatar: fotoUrlBusted,
          driverData: updatedDriver,
        };
        saveSessionUser(updatedUser);
        if (onUpdateUserProfile) {
          onUpdateUserProfile(updatedUser);
        }
      }

      setDraftDriverAvatar(fotoUrlBusted);
      setPendingDriverPhotoFile(null);
      setHasPendingDriverAvatar(false);
      setIsEditingDriverProfile(false);
      setDriverProfileSuccessMsg(isChangingPhoto ? 'Foto salva!' : 'Perfil atualizado com sucesso!');
      setTimeout(() => setDriverProfileSuccessMsg(null), 6000);
    } catch (err: any) {
      setDriverProfileErrorMsg(err?.message || 'Falha ao salvar perfil. Tente novamente.');
    } finally {
      setIsSavingDriverProfile(false);
    }
  };

  const handleCnhDocUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    try {
      const base64 = await compressImageToMax200KB(file);
      if (base64) setCnhDocPreview(base64);
    } catch (err) {
      console.log('Erro ao comprimir CNH:', err);
    }
  };

  const handleVehicleDocUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    try {
      const base64 = await compressImageToMax200KB(file);
      if (base64) setVehicleDocPreview(base64);
    } catch (err) {
      console.log('Erro ao comprimir foto do veículo:', err);
    }
  };

  // Driver's own PIX key where they receive 85% of ride earnings
  const [driverPixKey, setDriverPixKey] = useState<string>(
    currentDriver.pixKey || currentDriver.cpf || ''
  );
  const [savedDriverPixNotice, setSavedDriverPixNotice] = useState(false);

  // Carteira e Saques (Saldo de 85% já descontada comissão de 15%)
  const [walletPixKey, setWalletPixKey] = useState<string>(
    currentDriver.pixKey || currentDriver.cpf || ''
  );
  const [withdrawalSuccessMessage, setWithdrawalSuccessMessage] = useState<string | null>(null);
  const [withdrawalErrorMessage, setWithdrawalErrorMessage] = useState<string | null>(null);
  const [driverWithdrawals, setDriverWithdrawals] = useState<WithdrawalRequest[]>(() => {
    const drvEmail = (currentDriver.email || '').trim().toLowerCase();
    return getWithdrawals().filter(
      (w) =>
        (currentDriver.id && w.driverId === currentDriver.id) ||
        (drvEmail && (w.driverEmail || '').trim().toLowerCase() === drvEmail)
    );
  });

  const [referralBonuses, setReferralBonuses] = useState<SupabasePagamentoRow[]>([]);
  const [referredDrivers, setReferredDrivers] = useState<ReferralCandidateItem[]>([]);
  const [isLoadingReferrals, setIsLoadingReferrals] = useState(false);
  const [copiedReferralLink, setCopiedReferralLink] = useState(false);
  const [copiedReferralWhatsapp, setCopiedReferralWhatsapp] = useState(false);
  const [driverReferralCode, setDriverReferralCode] = useState<string>(
    currentDriver.codigoIndicacao || currentUser?.codigoIndicacao || ''
  );
  const [copiedDriverCode, setCopiedDriverCode] = useState(false);

  const isPromoZeroFeeActive = isDriverInLaunchZeroFeePromo(
    currentDriver.createdAt || currentDriver.registrationDate || currentUser?.createdAt
  );

  // Carrega exclusivamente os saques, bônus de indicação e indicados do motorista logado direto do Supabase
  useEffect(() => {
    const drvId = currentDriver?.id || currentUser?.id || '';
    const drvEmail = (currentDriver?.email || currentUser?.email || '').trim().toLowerCase();
    if (!drvId && !drvEmail) {
      setDriverWithdrawals([]);
      setReferralBonuses([]);
      setReferredDrivers([]);
      return;
    }

    let mounted = true;
    const callerForPayments: AppUser = currentUser || {
      id: drvId,
      name: currentDriver.name,
      email: drvEmail,
      phone: currentDriver.phone || '',
      role: 'driver',
      tipo: 'motorista',
      rating: currentDriver.rating || 0,
    };

    setIsLoadingReferrals(true);
    Promise.all([
      getPagamentosSupabase(callerForPayments).catch(() => [] as SupabasePagamentoRow[]),
      getDriverReferralsAndBonusesSupabase(callerForPayments).catch(() => [] as ReferralCandidateItem[]),
      drvEmail ? getUsuarioSupabase(drvEmail).catch(() => null) : Promise.resolve(null),
    ])
      .then(([rows, refs, cloudRow]) => {
        if (!mounted) return;
        const ownWithdrawals: WithdrawalRequest[] = rows
          .filter((p) => p.tipo === 'saque')
          .map((p) => ({
            id: p.id !== undefined && p.id !== null ? String(p.id) : '',
            driverId: p.id_motorista !== undefined && p.id_motorista !== null ? String(p.id_motorista) : drvId,
            driverName: p.nome_motorista || currentDriver.name || 'Condutor',
            driverEmail: (p.email_motorista || drvEmail).toLowerCase(),
            driverPhone: currentDriver.phone || '',
            pixKey: p.chave_pix || '',
            grossAmount: isPromoZeroFeeActive
              ? Number(Number(p.valor || 0).toFixed(2))
              : Number(((Number(p.valor || 0)) / 0.85).toFixed(2)),
            platformFee15: isPromoZeroFeeActive
              ? 0
              : Number((((Number(p.valor || 0)) / 0.85) * 0.15).toFixed(2)),
            weeklyFeeDeducted: 0,
            netAmount: Number(p.valor || 0),
            status: (p.status === 'paid' || p.status === 'pago' || p.status === 'approved') ? 'paid' : 'pending',
            requestedAt: p.data || new Date().toISOString(),
            paidAt: (p.status === 'paid' || p.status === 'pago' || p.status === 'approved') ? p.data : undefined,
          }));
        setDriverWithdrawals(ownWithdrawals);
        setReferralBonuses(rows.filter((p) => p.tipo === 'bonus_indicacao'));
        setReferredDrivers(refs);

        if (cloudRow && typeof cloudRow.saldo === 'number' && drvId) {
          const cloudSaldo = Number(cloudRow.saldo);
          const localBal = getDriverBalance(drvId, currentDriver.walletBalance || 0);
          if (cloudSaldo > localBal) {
            setDriverBalance(drvId, cloudSaldo);
          }
        }

        const existingCode = String(
          cloudRow?.codigo_indicacao ||
            currentDriver.codigoIndicacao ||
            currentUser?.codigoIndicacao ||
            ''
        )
          .trim()
          .toUpperCase();
        if (existingCode) {
          setDriverReferralCode(existingCode);
        } else {
          ensureUserReferralCodeSupabase({
            id: drvId,
            email: drvEmail,
            name: currentDriver.name || currentUser?.name,
          }).then((ensured) => {
            if (!mounted || !ensured) return;
            setDriverReferralCode(ensured);
            onUpdateDriver({ ...currentDriver, codigoIndicacao: ensured });
            if (currentUser) {
              const updatedUser: AppUser = {
                ...currentUser,
                codigoIndicacao: ensured,
                driverData: { ...(currentUser.driverData || currentDriver), codigoIndicacao: ensured },
              };
              saveSessionUser(updatedUser);
              if (onUpdateUserProfile) {
                onUpdateUserProfile(updatedUser);
              }
            }
          });
        }
      })
      .finally(() => {
        if (mounted) setIsLoadingReferrals(false);
      });

    return () => {
      mounted = false;
    };
  }, [currentUser?.id, currentUser?.email, currentDriver?.id, currentDriver?.email, dashboardSection]);

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
          onTriggerToast('Carteira Race', res.message, 'financial');
        }
      }
    }
  }, [currentDriver?.id]);

  const walletSummary = calculateWalletSummary(currentDriver);
  const ratingStats = getDriverRatingStats(currentDriver?.id);

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
    const drvEmail = (currentDriver.email || '').trim().toLowerCase();
    setDriverWithdrawals(
      getWithdrawals().filter(
        (w) =>
          (currentDriver.id && w.driverId === currentDriver.id) ||
          (drvEmail && (w.driverEmail || '').trim().toLowerCase() === drvEmail)
      )
    );

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

  // Modelo de repasse 85% / 15% sem taxa fixa
  const [copiedRacePix, setCopiedRacePix] = useState(false);

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
  const [regModel, setRegModel] = useState('');
  const [regPlate, setRegPlate] = useState('');
  const [regYear, setRegYear] = useState('');
  const [regColor, setRegColor] = useState('');
  const [regPixKey, setRegPixKey] = useState('');
  const [regTrunkType, setRegTrunkType] = useState('Baú 90 Litros');
  const [regRequirementsConfirmed, setRegRequirementsConfirmed] = useState(false);
  const [regAvatar, setRegAvatar] = useState('');
  const [regCnhFrontPhoto, setRegCnhFrontPhoto] = useState('');
  const [regCnhBackPhoto, setRegCnhBackPhoto] = useState('');
  const [regCrlvPhoto, setRegCrlvPhoto] = useState('');
  const [acceptedContract, setAcceptedContract] = useState(false);
  const [acceptedTerms, setAcceptedTerms] = useState(false);
  const [acceptedLgpd, setAcceptedLgpd] = useState(false);
  const [acceptedPrivacy, setAcceptedPrivacy] = useState(false);
  const [regError, setRegError] = useState<string | null>(null);
  const [isRegistering, setIsRegistering] = useState(false);
  const [registeredSuccess, setRegisteredSuccess] = useState(false);

  const handleRegAvatarUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    const reader = new FileReader();
    reader.onloadend = async () => {
      if (typeof reader.result === 'string') {
        const compressed = await compressImageToMax200KB(reader.result);
        setRegAvatar(compressed);
      }
    };
    reader.readAsDataURL(file);
  };

  const handleRegDocPhotoUpload = (
    e: React.ChangeEvent<HTMLInputElement>,
    setter: (v: string) => void
  ) => {
    const file = e.target.files?.[0];
    if (!file) return;
    const reader = new FileReader();
    reader.onloadend = async () => {
      if (typeof reader.result === 'string') {
        const compressed = await compressImageToMax200KB(reader.result);
        setter(compressed);
      }
    };
    reader.readAsDataURL(file);
  };

  const handleCategoryChange = (newCat: VehicleCategory) => {
    setRegCategory(newCat);
    setRegError(null);
    setComfortWarning(null);
    setRegRequirementsConfirmed(false);
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

  // Conta sempre liberada (sem bloqueio por mensalidade)
  const subStatus = { isActive: true, label: 'Conta Liberada • Saque toda sexta' };

  // Economia vs Uber/99 (comissão média de ~28% vs 0% na Promoção Lançamento ou 15% Race)
  const weeklyEarnings = currentDriver.earningsWeek || 0;
  const uberCut = Math.round(weeklyEarnings * 0.28);
  const raceFee = isPromoZeroFeeActive ? 0 : Math.round(weeklyEarnings * 0.15);
  const driverSavingsVsUber99 = Math.max(0, uberCut - raceFee);

  const toggleOnline = () => {
    if (!isCategoryConfigured || !isDocumentsAccepted) {
      setIsOnline(false);
      setOnlineBlockNotice('Marque os 4 documentos para trabalhar');
      setIsEditingCategory(true);
      return;
    }
    if (!isApprovedDriver) {
      setIsOnline(false);
      setOnlineBlockNotice(
        approvalStatus === 'reprovado'
          ? (currentDriver.rejectionReason ||
            'Seu cadastro foi reprovado pelo ADM. Atualize e reenvie seus documentos (CNH frente/verso e CRLV).')
          : 'Seu cadastro está com status PENDENTE. Só motoristas aprovados pelo ADM podem ficar ONLINE.'
      );
      return;
    }
    setOnlineBlockNotice(null);
    const nextStatus = !isOnline;
    const nextStatusStr: 'online' | 'offline' = nextStatus ? 'online' : 'offline';
    setIsOnline(nextStatus);
    onUpdateDriver({
      ...currentDriver,
      status: nextStatusStr,
    });
    updateDriverOnlineStatusSupabase({
      id: currentDriver.id,
      email: currentDriver.email,
      status: nextStatusStr,
      lat: currentDriver.lat,
      lng: currentDriver.lng,
    }).catch(() => {});

    if (nextStatus && typeof navigator !== 'undefined' && navigator.geolocation) {
      navigator.geolocation.getCurrentPosition(
        (pos) => {
          const lat = pos.coords.latitude;
          const lng = pos.coords.longitude;
          onUpdateDriver({
            ...currentDriver,
            status: 'online',
            lat,
            lng,
          });
          updateDriverOnlineStatusSupabase({
            id: currentDriver.id,
            email: currentDriver.email,
            status: 'online',
            lat,
            lng,
          }).catch(() => {});
        },
        () => {},
        { enableHighAccuracy: true, timeout: 8000 }
      );
    }
  };

  const handleLoginSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!loginEmail || !loginPassword) {
      setLoginFeedback('Por favor, informe seu login (e-mail) e sua senha.');
      return;
    }

    const verification = await verifyUserLoginAsync(loginEmail, loginPassword);
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
        status: 'offline',
      });
    }

    const rawDriver = verification.driver || loggedUser.driverData;
    const appsMap = await fetchDriverApplicationsSupabase(loggedUser.email).catch(() => ({} as Record<string, any>));
    const appRec = appsMap[loggedUser.email.toLowerCase()];
    const resolvedDriver = rawDriver ? mergeDriverWithApplication(rawDriver, appRec) : rawDriver;
    if (resolvedDriver) {
      onUpdateDriver(resolvedDriver);
    }
    const canStartOnline = Boolean(
      resolvedDriver?.approvalStatus === 'aprovado' &&
      resolvedDriver?.requirementsConfirmed === true &&
      resolvedDriver?.documentosAceitos !== false &&
      resolvedDriver?.vehiclePlate?.trim() &&
      resolvedDriver?.vehicleModel?.trim()
    );
    setIsOnline(canStartOnline);
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

  const handleRegisterSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setRegError(null);
    setComfortWarning(null);

    const cleanEmail = regEmail.replace(/\s+/g, '').trim().toLowerCase();
    const cleanWhatsApp = regPhone.replace(/\D/g, '');

    if (!regName || !cleanWhatsApp || !regCpf || !regModel || !regPlate || !regColor.trim() || !regCnh.trim() || !cleanEmail || !regPassword) {
      setRegError('Por favor, preencha todos os campos obrigatórios (*), incluindo CNH, Placa, Modelo e Cor do veículo.');
      return;
    }

    if (!regAvatar) {
      setRegError('Envie uma foto de perfil obrigatória para segurança nas corridas.');
      return;
    }

    if (!regCnhFrontPhoto || !regCnhBackPhoto || !regCrlvPhoto) {
      setRegError('Envie as fotos obrigatórias da CNH (frente e verso) e do CRLV do veículo para aprovação do ADM.');
      return;
    }

    if (!isValidEmail(cleanEmail)) {
      setRegError('E-mail inválido! Informe um e-mail válido (ex: nome@dominio.com).');
      return;
    }

    if (!isValidWhatsApp11(cleanWhatsApp)) {
      setRegError('WhatsApp inválido! Digite exatamente 11 dígitos com DDD + 9 (ex: 19999999999).');
      return;
    }

    if (!isValidPassword(regPassword)) {
      setRegError('A senha deve conter no mínimo 6 dígitos para sua segurança.');
      return;
    }

    if (regPassword !== regConfirmPassword) {
      setRegError('A confirmação de senha não confere com a senha digitada.');
      return;
    }

    const yearNum = parseInt(regYear, 10) || 2023;
    if (regCategory === 'economica' && yearNum < 2015) {
      setRegError('Seu veículo não atende aos requisitos de Motorista Econômico (mínimo 2015). Escolha outra modalidade ou cadastre outro veículo.');
      return;
    }
    if (regCategory === 'confort') {
      const check = validateComfortEligibility(regModel, yearNum);
      if (!check.eligible) {
        setRegError(check.feedbackMessage);
        return;
      }
    }
    if (regCategory === 'moto_passageiro' && yearNum < 2018) {
      setRegError('Sua moto não atende aos requisitos de Motoboy Passageiro (mínimo 2018, 150cc+). Escolha outra modalidade ou cadastre outra moto.');
      return;
    }
    if (regCategory === 'moto_entrega' && yearNum < 2015) {
      setRegError('Sua moto não atende aos requisitos de Motoboy Entregas (mínimo 2015, 125cc+). Cadastre uma moto a partir de 2015.');
      return;
    }

    if (!regRequirementsConfirmed) {
      setRegError('Marque a caixa obrigatória: "Li e confirmo que meu veículo atende a todas as exigências acima".');
      return;
    }

    if (!acceptedContract || !acceptedTerms || !acceptedLgpd || !acceptedPrivacy) {
      setRegError('Marque os 4 documentos para trabalhar');
      return;
    }

    setIsRegistering(true);
    try {
      const dupCheck = await checkDuplicateRegistrationSupabase({
        email: cleanEmail,
        whatsapp: cleanWhatsApp,
      });
      if (dupCheck.isDuplicate) {
        setRegError(dupCheck.message || 'Este e-mail já está cadastrado. Clique em Entrar ou em Esqueci minha senha.');
        return;
      }

      const finalCategory = regCategory;
      const comfortEligible = finalCategory === 'confort';
      const reason = comfortEligible ? 'Aprovado para Confort (2020+).' : '';

      const confirmedNow = new Date().toISOString();
      const newDriver: Driver = {
        id: '',
        name: regName.trim(),
        avatar: regAvatar,
        phone: cleanWhatsApp,
        email: cleanEmail,
        cpf: regCpf,
        cnh: regCnh ? `${regCnh} (EAR Ativo)` : '',
        category: finalCategory,
        categoryConfigured: true,
        requirementsConfirmed: true,
        requirementsConfirmedAt: confirmedNow,
        documentosAceitos: true,
        dataAceite: confirmedNow,
        vehicleModel: regModel,
        vehiclePlate: regPlate.toUpperCase(),
        vehicleColor: regColor.trim(),
        vehicleYear: yearNum,
        cnhPhoto: regCnhFrontPhoto,
        cnhFrontPhoto: regCnhFrontPhoto,
        cnhBackPhoto: regCnhBackPhoto,
        crlvPhoto: regCrlvPhoto,
        approvalStatus: 'pendente',
        rating: 0,
        totalRides: 0,
        status: 'pending_approval',
        lat: -23.0903,
        lng: -47.2180,
        weeklyPlanActive: true,
        weeklyFeePaidAt: confirmedNow,
        weeklyFeeExpiresAt: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000).toISOString(),
        weeklyPlanExpiresAt: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000).toISOString(),
        weeklyPlanPrice: WEEKLY_FEE,
        pixKey: regPixKey.trim() || regCpf,
        trunkType: finalCategory === 'moto_entrega' ? regTrunkType : undefined,
        earningsToday: 0,
        earningsWeek: 0,
        cnhVerified: false,
        vehicleVerified: false,
        criminalRecordClear: true,
        registrationDate: confirmedNow.split('T')[0],
        comfortEligible,
        comfortEligibilityReason: reason,
      };

      // Determinar perfil e tipo para isolamento no sistema
      const userRole: UserRole = (finalCategory === 'moto_passageiro' || finalCategory === 'moto_entrega') ? 'motoboy' : 'driver';
      const userTipo: UserTipo = 
        finalCategory === 'economica' ? 'motorista_economico' :
        finalCategory === 'confort' ? 'motorista_confort' :
        finalCategory === 'moto_passageiro' ? 'motoboy_passageiro' : 'motoboy_entregas';

      // Salvar no Supabase Auth + usuarios juntos (rollback automático se um falhar), SEM auto-login
      const saveRes = await saveUserAccount({
        id: newDriver.id,
        name: newDriver.name,
        email: cleanEmail,
        phone: cleanWhatsApp,
        whatsapp: cleanWhatsApp,
        password: regPassword,
        role: userRole,
        tipo: userTipo,
        placa: newDriver.vehiclePlate,
        avatar: newDriver.avatar || '',
        rating: newDriver.rating,
        driverData: newDriver,
        createdAt: confirmedNow,
        documentos_aceitos: true,
        aceitou_contrato: true,
        aceitou_termos: true,
        aceitou_lgpd: true,
        data_aceite: confirmedNow,
      }, false);

      if (!saveRes.success) {
        setRegError(saveRes.error || 'Erro ao salvar cadastro de motorista no Supabase.');
        return;
      }

      if (saveRes.data?.id !== undefined && saveRes.data?.id !== null) {
        newDriver.id = String(saveRes.data.id);
      }

      await saveDriverApplicationSupabase({
        id: newDriver.id,
        email: cleanEmail,
        name: newDriver.name,
        phone: cleanWhatsApp,
        whatsapp: cleanWhatsApp,
        category: finalCategory,
        vehicleModel: newDriver.vehicleModel,
        vehicleColor: newDriver.vehicleColor,
        vehiclePlate: newDriver.vehiclePlate,
        vehicleYear: newDriver.vehicleYear,
        cnh: newDriver.cnh,
        avatar: newDriver.avatar,
        cnhFrontPhoto: regCnhFrontPhoto,
        cnhBackPhoto: regCnhBackPhoto,
        crlvPhoto: regCrlvPhoto,
        approvalStatus: 'pendente',
        online: false,
        driverStatus: 'pending_approval',
        documentosAceitos: true,
        dataAceite: confirmedNow,
      }).catch(() => {});

      onRegisterDriver(newDriver);
      setRegisteredSuccess(false);

      // Conforme solicitado: após cadastro, entrar com login e senha dentro do aplicativo
      setLoginEmail(cleanEmail);
      setLoginPassword('');
      setLoginFeedback(null);
      setLoginSuccessNotice(
        `Cadastro de condutor (${newDriver.name}) enviado para análise do ADM! Assim que aprovado, você poderá ficar ONLINE.`
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
    } finally {
      setIsRegistering(false);
    }
  };

  const handleCopyRacePixKey = () => {
    navigator.clipboard?.writeText(RACE_PIX_KEY);
    setCopiedRacePix(true);
    setTimeout(() => setCopiedRacePix(false), 2500);
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
        'Sua chave PIX para receber seus 85% das corridas toda sexta-feira foi atualizada com sucesso.',
        'financial'
      );
    }
  };

  const activePropSearchingRide =
    activeRide &&
    isSearchingRideStatus(activeRide.status) &&
    isRidePaidOrConfirmedCash(activeRide) &&
    doesRideMatchDriverCategory(activeRide) &&
    isDeliveryRideCompleteForDriver(activeRide) &&
    !dismissedRideIdsRef.current.has(getRideUniqueKey(activeRide))
      ? activeRide
      : null;

  const openIncomingRide: Ride | null =
    isOnline && isApprovedDriver && !acceptedDriverRide
      ? (activePropSearchingRide || cloudSearchingRide)
      : null;

  const acceptIncomingRideHandler = async (rideToAccept: Ride) => {
    const price = rideToAccept.price || 0;
    const grossFare = rideToAccept.originalPrice ?? price;
    const split = calculateRideSplitForDriver(grossFare, currentDriver, rideToAccept.createdAt);
    const driverEarns = split.driverEarnings;
    const raceCommission = split.platformFee;
    const isCash =
      rideToAccept.paymentMethod === 'money' ||
      rideToAccept.paymentMethod === 'dinheiro';

    let driverForRide: Driver = {
      ...currentDriver,
      avatar: currentDriver.avatar || currentUser?.avatar || '',
    };
    if (!driverForRide.avatar && (driverForRide.email || driverForRide.id)) {
      const prof = await fetchUsuarioPhotoByIdentity({
        id: driverForRide.id,
        email: driverForRide.email,
      }).catch(() => null);
      if (prof?.avatar) {
        driverForRide = { ...driverForRide, avatar: prof.avatar };
        onUpdateDriver(driverForRide);
      }
    }

    if (rideToAccept.id && /^\d+$/.test(String(rideToAccept.id))) {
      await acceptCorridaSupabase(rideToAccept.id, driverForRide).catch(() => {});
    }

    let hydratedRideToAccept = rideToAccept;
    if (rideToAccept.id && /^\d+$/.test(String(rideToAccept.id))) {
      const [fullRide, counterpart] = await Promise.all([
        getCorridaByIdSupabase(rideToAccept.id).catch(() => null),
        fetchRideCounterpartProfileSupabase(rideToAccept.id).catch(() => null),
      ]);
      if (fullRide) {
        hydratedRideToAccept = { ...rideToAccept, ...fullRide };
      }
      if (counterpart) {
        hydratedRideToAccept = {
          ...hydratedRideToAccept,
          passengerAvatar: hydratedRideToAccept.passengerAvatar || counterpart.avatar || '',
          passengerName:
            hydratedRideToAccept.passengerName && hydratedRideToAccept.passengerName !== 'Passageiro RACE'
              ? hydratedRideToAccept.passengerName
              : counterpart.name || hydratedRideToAccept.passengerName || 'Passageiro',
          passengerPhone: hydratedRideToAccept.passengerPhone || counterpart.phone || '',
        };
      }
    }

    if (!hydratedRideToAccept.passengerAvatar) {
      const [hydrated] = await hydrateRidesWithUserPhotosSupabase([hydratedRideToAccept]).catch(() => [
        hydratedRideToAccept,
      ]);
      if (hydrated) hydratedRideToAccept = hydrated;
    }

    const acceptedRideObj: Ride = {
      ...hydratedRideToAccept,
      driverEarnings: driverEarns,
      platformFee: raceCommission,
      driver: driverForRide,
      status: 'aceita',
    };
    setAcceptedDriverRide(acceptedRideObj);
    setCloudSearchingRide(null);
    if (onAcceptIncomingRide) {
      onAcceptIncomingRide(acceptedRideObj);
    }
    setAcceptedRideNotice(
      isCash
        ? `Corrida em dinheiro aceita! Receber ${formatBRL(price)} em dinheiro no final da corrida (${split.driverSharePercent}% seu: ${formatBRL(driverEarns)} • Race ${split.commissionPercent}%: ${formatBRL(raceCommission)})`
        : `Corrida aceita! Você receberá ${formatBRL(driverEarns)} (${split.driverSharePercent}%) • Comissão Race ${split.commissionPercent}%: ${formatBRL(raceCommission)}`
    );
    setIsDriverGpsOpen(true);
    try {
      confetti({ particleCount: 40, spread: 55, origin: { y: 0.6 } });
    } catch {}
  };

  const rejectIncomingRideHandler = (rideToReject: Ride) => {
    const key = getRideUniqueKey(rideToReject);
    dismissedRideIdsRef.current.add(key);
    setCloudSearchingRide(null);
    setDismissedTick((t) => t + 1);
  };

  return (
    <div className="space-y-5">
      {/* ALERTA GRANDE GLOBAL EM TEMPO REAL NA TELA DO MOTORISTA ONLINE */}
      {openIncomingRide && (() => {
        const alertPrice = openIncomingRide.price || 0;
        const alertGrossFare = openIncomingRide.originalPrice ?? alertPrice;
        const alertSplit = calculateRideSplitForDriver(alertGrossFare, currentDriver, openIncomingRide.createdAt);
        const driverNetAlert = alertSplit.driverEarnings;
        const isCashAlert =
          openIncomingRide.paymentMethod === 'money' ||
          openIncomingRide.paymentMethod === 'dinheiro';
        const paymentLabel = isCashAlert
          ? 'DINHEIRO'
          : openIncomingRide.paymentMethod === 'race_pay'
          ? 'CRÉDITO RACE'
          : openIncomingRide.paymentMethod === 'credit_card'
          ? 'CARTÃO'
          : 'PIX';
        return (
          <div className="bg-zinc-950 text-white border-4 border-emerald-500 rounded-3xl p-5 sm:p-6 shadow-2xl space-y-4 animate-fade-in">
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 border-b border-zinc-800 pb-3">
              <div className="flex items-center gap-2.5">
                <span className="w-4 h-4 rounded-full bg-emerald-400 animate-ping shrink-0" />
                <span className="text-lg sm:text-2xl font-heading font-black text-emerald-400 tracking-wide">
                  Nova corrida! {formatBRL(driverNetAlert)} para você
                </span>
              </div>
              <span className="text-xs font-mono font-black bg-amber-500/20 text-amber-300 border border-amber-500/50 px-3 py-1 rounded-full self-start sm:self-center">
                Pagamento: {paymentLabel} • Total: {formatBRL(alertPrice)}
              </span>
            </div>

            {isCashAlert && (
              <div className="bg-emerald-600 text-white rounded-2xl px-4 py-3 text-center font-heading font-black text-base sm:text-lg shadow-md">
                Receber {formatBRL(alertPrice)} em dinheiro no final da corrida
              </div>
            )}

            <div className="bg-zinc-900 border border-zinc-800 rounded-2xl p-4 text-sm space-y-3">
              {/* Dados pessoais do passageiro ficam ocultos até o motorista ACEITAR a corrida */}
              <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 border-b border-zinc-800 pb-3">
                <div className="flex items-center gap-3.5 min-w-0">
                  <div className="w-16 h-16 sm:w-20 sm:h-20 rounded-full bg-emerald-500/20 text-emerald-300 border-3 border-emerald-400 shadow-lg shrink-0 flex flex-col items-center justify-center font-heading font-black">
                    <User className="w-7 h-7 opacity-90" />
                  </div>
                  <div className="min-w-0">
                    <span className="text-[10px] font-mono font-bold uppercase text-emerald-400 tracking-wider block">
                      Novo Chamado Próximo
                    </span>
                    <p className="font-heading font-black text-lg sm:text-xl text-amber-400 truncate">
                      Passageiro RACE
                    </p>
                    <p className="text-xs text-zinc-400 font-mono truncate">
                      Nome e contato liberados após aceitar
                    </p>
                  </div>
                </div>

                {/* Foto redonda do MOTORISTA com Nome e Placa */}
                <div className="flex items-center gap-2.5 bg-zinc-950/90 border border-zinc-700 rounded-2xl px-3 py-2 shrink-0">
                  {(currentDriver.avatar || currentUser?.avatar) ? (
                    <img
                      src={currentDriver.avatar || currentUser?.avatar}
                      alt={currentDriver.name}
                      className="w-12 h-12 rounded-full object-cover border-2 border-[#ff6a00] shrink-0"
                    />
                  ) : (
                    <div className="w-12 h-12 rounded-full bg-[#ff6a00]/20 text-[#ff6a00] border-2 border-[#ff6a00] shrink-0 flex items-center justify-center font-heading font-black text-lg">
                      {(currentDriver.name || 'M').trim().charAt(0).toUpperCase()}
                    </div>
                  )}
                  <div className="min-w-0">
                    <span className="text-[10px] font-mono text-zinc-400 block truncate max-w-[140px]">
                      {currentDriver.name}
                    </span>
                    <span className="text-xs font-mono font-black text-[#ff6a00] block">
                      {currentDriver.vehiclePlate || 'Sem placa'}
                    </span>
                  </div>
                </div>
              </div>

              <p className="text-zinc-200 font-semibold">
                <strong className="text-emerald-400">Origem:</strong> {openIncomingRide.pickup?.address}
              </p>
              <p className="text-zinc-200 font-semibold">
                <strong className="text-[#ff6a00]">Destino:</strong> {openIncomingRide.destination?.address}
              </p>

              {openIncomingRide.modalityDetails && (
                <div className="mt-2 pt-2 border-t border-zinc-800 text-xs text-zinc-200 space-y-1">
                  {normalizeRideCategory(openIncomingRide.category) === 'moto_entrega' ? (
                    <>
                      <p>
                        <strong className="text-amber-400">Entrega:</strong>{' '}
                        {openIncomingRide.modalityDetails.deliveryDescription} ({openIncomingRide.modalityDetails.deliveryWeight})
                      </p>
                      <p>
                        <strong className="text-amber-400">Destinatário:</strong>{' '}
                        {openIncomingRide.modalityDetails.recipientName} (contato liberado após aceitar)
                      </p>
                      <p>
                        <strong className="text-amber-400">Quem paga:</strong>{' '}
                        {openIncomingRide.modalityDetails.whoPays === 'destinatario' ? 'Quem recebe (Destinatário)' : 'Quem envia (Remetente)'}
                      </p>
                    </>
                  ) : normalizeRideCategory(openIncomingRide.category) === 'moto_passageiro' ? (
                    <p className="text-cyan-300 font-bold">
                      1 passageiro • Capacete e sem bagagem grande confirmados
                    </p>
                  ) : openIncomingRide.modalityDetails.passengerCount ? (
                    <p className="text-emerald-300 font-bold">
                      Passageiros: {openIncomingRide.modalityDetails.passengerCount}{' '}
                      {openIncomingRide.modalityDetails.passengerCount === 1 ? 'pessoa' : 'pessoas'}
                    </p>
                  ) : null}
                </div>
              )}
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
              <button
                type="button"
                onClick={() => acceptIncomingRideHandler(openIncomingRide)}
                className="sm:col-span-2 min-h-[64px] bg-emerald-600 hover:bg-emerald-500 active:scale-95 text-white font-heading font-black text-xl sm:text-2xl rounded-2xl shadow-xl border-2 border-emerald-400 flex items-center justify-center gap-3 cursor-pointer transition-all uppercase tracking-wider"
              >
                <CheckCircle2 className="w-7 h-7 shrink-0" />
                <span>Aceitar</span>
              </button>
              <button
                type="button"
                onClick={() => rejectIncomingRideHandler(openIncomingRide)}
                className="min-h-[64px] bg-rose-700 hover:bg-rose-600 active:scale-95 text-white font-heading font-black text-lg rounded-2xl shadow-lg border-2 border-rose-500 flex items-center justify-center gap-2 cursor-pointer transition-all uppercase"
              >
                <XCircle className="w-6 h-6 shrink-0" />
                <span>Recusar</span>
              </button>
            </div>
          </div>
        );
      })()}

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
                  {(currentDriver.avatar || currentUser?.avatar) ? (
                    <img
                      src={currentDriver.avatar || currentUser?.avatar}
                      alt={currentDriver.name}
                      className="w-16 h-16 rounded-full object-cover border-2 border-amber-500 shadow-md"
                    />
                  ) : (
                    <div className="w-16 h-16 rounded-full bg-amber-100 text-amber-800 border-2 border-amber-500 shadow-md flex flex-col items-center justify-center font-heading font-black">
                      <span className="text-xl leading-none">
                        {(currentDriver.name || 'M').trim().charAt(0).toUpperCase()}
                      </span>
                      <User className="w-3.5 h-3.5 opacity-75 mt-0.5" />
                    </div>
                  )}
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
                    {!isCategoryConfigured ? (
                      <span className="bg-amber-100 text-amber-900 text-xs font-black px-2.5 py-0.5 rounded-md border border-amber-300 flex items-center gap-1">
                        <Lock className="w-3.5 h-3.5" /> Escolha sua categoria
                      </span>
                    ) : (
                      <>
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
                      </>
                    )}
                  </div>
                  <p className="text-sm text-amber-700 font-mono font-bold">
                    {isCategoryConfigured
                      ? `${currentDriver.vehicleModel} ${currentDriver.vehicleYear ? `(${currentDriver.vehicleYear})` : ''} • ${currentDriver.vehiclePlate}`
                      : 'Categoria e veículo ainda não cadastrados'}
                  </p>
                  {(driverReferralCode || currentDriver.codigoIndicacao || currentUser?.codigoIndicacao) && (
                    <div className="mt-1.5 inline-flex items-center gap-2 flex-wrap bg-orange-50 border border-orange-300 rounded-xl px-2.5 py-1">
                      <span className="text-xs font-bold text-slate-800">
                        Seu código de indicação:{' '}
                        <strong className="font-mono font-black text-[#ff6a00] tracking-wider">
                          {driverReferralCode || currentDriver.codigoIndicacao || currentUser?.codigoIndicacao}
                        </strong>
                      </span>
                      <button
                        type="button"
                        onClick={() => {
                          const code = driverReferralCode || currentDriver.codigoIndicacao || currentUser?.codigoIndicacao || '';
                          if (!code) return;
                          try { navigator.clipboard.writeText(code); } catch {}
                          setCopiedDriverCode(true);
                          setTimeout(() => setCopiedDriverCode(false), 2500);
                        }}
                        className="px-2 py-0.5 rounded-lg bg-[#ff6a00] hover:bg-[#e05e00] text-white font-heading font-black text-[11px] inline-flex items-center gap-1 cursor-pointer active:scale-95 transition-all"
                      >
                        {copiedDriverCode ? <Check className="w-3 h-3" /> : <Copy className="w-3 h-3" />}
                        <span>{copiedDriverCode ? 'Copiado!' : 'Copiar'}</span>
                      </button>
                    </div>
                  )}
                  <div className="flex flex-wrap items-center gap-2 mt-1">
                    <span className="text-sm text-slate-700 font-bold bg-amber-50 border border-amber-200 px-2 py-0.5 rounded-md">
                      {ratingStats.average.toFixed(1)} ★ ({ratingStats.totalReviews} avaliações)
                    </span>
                    <span className="text-xs bg-emerald-100 text-emerald-800 px-2 py-0.5 rounded font-black">
                      85% seu • 15% Race
                    </span>
                    <span className="text-xs text-slate-500 font-mono">
                      Login: {currentDriver.email}
                    </span>
                    {isCategoryConfigured && !isOnline && (
                      <button
                        type="button"
                        onClick={() => setIsEditingCategory(true)}
                        className="text-xs font-bold text-[#ff6a00] hover:underline cursor-pointer"
                      >
                        Trocar categoria
                      </button>
                    )}
                  </div>
                </div>
              </div>

              {/* Online Button (Bloqueado em cinza enquanto não escolher categoria ou aguarda ADM) */}
              {!isCategoryConfigured ? (
                <button
                  type="button"
                  onClick={() => setIsEditingCategory(true)}
                  className="flex items-center gap-2 px-4 sm:px-5 py-3 rounded-2xl font-heading font-black text-xs sm:text-sm bg-[#ff6a00] hover:bg-[#e05e00] text-white border border-[#ff6a00] cursor-pointer shrink-0 shadow-md transition-all"
                >
                  <ShieldCheck className="w-4 h-4 shrink-0" />
                  <span>Completar cadastro para trabalhar</span>
                </button>
              ) : !isApprovedDriver ? (
                <button
                  type="button"
                  onClick={toggleOnline}
                  className={`flex items-center gap-2 px-4 sm:px-5 py-3 rounded-2xl font-heading font-black text-xs sm:text-sm border shrink-0 cursor-pointer ${
                    approvalStatus === 'reprovado'
                      ? 'bg-rose-100 text-rose-800 border-rose-300'
                      : 'bg-amber-100 text-amber-900 border-amber-300'
                  }`}
                >
                  <Lock className="w-4 h-4 shrink-0" />
                  <span>
                    {approvalStatus === 'reprovado'
                      ? 'Cadastro Reprovado'
                      : 'Aguardando Aprovação ADM'}
                  </span>
                </button>
              ) : (
                <button
                  type="button"
                  onClick={toggleOnline}
                  className={`flex items-center gap-2 px-5 py-3 rounded-2xl font-heading font-black text-xs sm:text-sm shadow-md transition-all cursor-pointer active:scale-95 shrink-0 ${
                    isOnline
                      ? 'bg-emerald-600 text-white hover:bg-emerald-500 ring-2 ring-emerald-300'
                      : 'bg-emerald-600 text-white hover:bg-emerald-500'
                  }`}
                >
                  <Power className="w-4 h-4" />
                  <span>{isOnline ? 'ONLINE' : 'FICAR ONLINE'}</span>
                </button>
              )}
            </div>

            {onlineBlockNotice && (
              <div className="mt-4 bg-rose-50 border border-rose-300 text-rose-900 rounded-2xl p-3 text-xs font-bold flex items-center gap-2">
                <AlertTriangle className="w-4 h-4 text-rose-600 shrink-0" />
                <span>{onlineBlockNotice}</span>
              </div>
            )}

            {isCategoryConfigured && !isApprovedDriver && (
              <div
                className={`mt-4 rounded-2xl p-4 border-2 flex flex-col sm:flex-row sm:items-center justify-between gap-3 ${
                  approvalStatus === 'reprovado'
                    ? 'bg-rose-50 border-rose-300 text-rose-950'
                    : 'bg-amber-50 border-amber-300 text-amber-950'
                }`}
              >
                <div className="flex items-start gap-3">
                  <Clock
                    className={`w-5 h-5 shrink-0 mt-0.5 ${
                      approvalStatus === 'reprovado' ? 'text-rose-600' : 'text-amber-600'
                    }`}
                  />
                  <div className="space-y-1 text-xs sm:text-sm">
                    <strong className="font-heading font-black block uppercase tracking-wide">
                      {approvalStatus === 'reprovado'
                        ? 'Cadastro Reprovado pelo ADM'
                        : 'Cadastro Pendente — Aguardando Aprovação do ADM'}
                    </strong>
                    <p className="font-medium leading-snug">
                      {approvalStatus === 'reprovado'
                        ? currentDriver.rejectionReason ||
                          'Verifique as fotos da CNH (frente e verso), CRLV e dados do veículo e reenvie para nova análise.'
                        : 'Seus documentos (CNH frente e verso, CRLV, placa, modelo e cor) estão em análise. Você não aparece como condutor online até o ADM aprovar.'}
                    </p>
                  </div>
                </div>
                <button
                  type="button"
                  onClick={() => setIsEditingCategory(true)}
                  className="px-4 py-2.5 rounded-xl bg-slate-900 hover:bg-slate-800 text-white font-heading font-black text-xs shrink-0 cursor-pointer"
                >
                  {approvalStatus === 'reprovado' ? 'Reenviar Documentos' : 'Editar Documentos'}
                </button>
              </div>
            )}
          </div>

          {/* TELA OBRIGATÓRIA DE ESCOLHA DE CATEGORIA ANTES DE FICAR ONLINE */}
          {(!isCategoryConfigured || isEditingCategory) && (
            <DriverWorkSelectionView
              currentUser={
                currentUser || {
                  id: currentDriver.id,
                  name: currentDriver.name,
                  email: currentDriver.email,
                  phone: currentDriver.phone,
                  role:
                    currentDriver.category === 'moto_passageiro' ||
                    currentDriver.category === 'moto_entrega'
                      ? 'motoboy'
                      : 'driver',
                  avatar: currentDriver.avatar,
                  rating: currentDriver.rating,
                  driverData: currentDriver,
                }
              }
              isMandatorySetup={!isCategoryConfigured}
              hideLockedOnlineButton={!isCategoryConfigured}
              onOpenPrivacyPage={onOpenPrivacyPage}
              onBackToRides={isEditingCategory ? () => setIsEditingCategory(false) : undefined}
              onCompleteDriverRegister={(updatedDriver) => {
                const approved = updatedDriver.approvalStatus === 'aprovado';
                onUpdateDriver(updatedDriver);
                setIsOnline(approved && updatedDriver.status === 'online');
                setIsEditingCategory(false);
                if (onTriggerToast) {
                  onTriggerToast(
                    approved ? 'Modalidade atualizada!' : 'Cadastro enviado para aprovação!',
                    approved
                      ? 'Sua modalidade e dados do veículo foram salvos no Supabase.'
                      : 'Seus documentos (CNH e CRLV) estão com status PENDENTE aguardando aprovação do ADM.',
                    'system'
                  );
                }
              }}
            />
          )}

          {/* Promoção Lançamento / Modelo Oficial Banner */}
          {isCategoryConfigured && !isEditingCategory && (
            <>
          <div className={`border-2 rounded-3xl p-5 flex flex-col sm:flex-row sm:items-center justify-between gap-3 shadow-sm ${
            isPromoZeroFeeActive
              ? 'bg-gradient-to-r from-orange-500/15 via-amber-500/20 to-emerald-500/15 border-orange-500'
              : 'bg-gradient-to-r from-amber-500/10 via-amber-500/20 to-amber-500/10 border-amber-400'
          }`}>
            <div className="flex items-center gap-3.5">
              <div className={`w-12 h-12 rounded-2xl font-black flex items-center justify-center shrink-0 shadow-sm ${
                isPromoZeroFeeActive ? 'bg-[#ff6a00] text-white' : 'bg-amber-500 text-slate-950'
              }`}>
                <Zap className="w-6 h-6" />
              </div>
              <div>
                <h4 className={`font-heading font-black text-base sm:text-lg ${
                  isPromoZeroFeeActive ? 'text-orange-950' : 'text-amber-900'
                }`}>
                  {isPromoZeroFeeActive ? '100% PARA VOCÊ • 0% RACE (PROMO LANÇAMENTO)' : '85% PARA VOCÊ • 15% RACE'}
                </h4>
                <p className="text-xs sm:text-sm text-slate-700 font-medium">
                  {isPromoZeroFeeActive
                    ? LAUNCH_PROMO_EARNINGS_BADGE_TEXT
                    : 'Você fica com 85% de cada corrida, Race fica com 15% - sem mensalidade, sem taxa para trabalhar.'}
                </p>
              </div>
            </div>

            <div className="text-left sm:text-right shrink-0">
              <span className="text-xs text-slate-500 font-mono block font-bold">
                {isPromoZeroFeeActive ? 'Taxa 0% até 17/12/2026' : 'Modelo Oficial'}
              </span>
              <span className="text-sm font-black flex items-center gap-1 sm:justify-end text-emerald-700">
                <CheckCircle2 className="w-4 h-4 text-emerald-600" />
                {subStatus.label}
              </span>
            </div>
          </div>

          {/* Navegação entre as 5 Seções do Dashboard do Condutor */}
          <div className="grid grid-cols-2 sm:grid-cols-5 gap-2 bg-slate-100 p-1.5 rounded-2xl border border-slate-200">
            <button
              type="button"
              onClick={() => setDashboardSection('corridas')}
              className={`py-2.5 px-3 rounded-xl text-xs sm:text-sm font-heading font-black transition-all cursor-pointer flex items-center justify-center gap-1.5 ${
                dashboardSection === 'corridas'
                  ? 'bg-amber-500 text-slate-950 shadow-sm'
                  : 'text-slate-600 hover:text-slate-950 hover:bg-white/60'
              }`}
            >
              <Car className="w-4 h-4 shrink-0" />
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
              <Wallet className="w-4 h-4 shrink-0" />
              <span>Meu Saldo</span>
            </button>
            <button
              type="button"
              onClick={() => setDashboardSection('indicar')}
              className={`py-2.5 px-3 rounded-xl text-xs sm:text-sm font-heading font-black transition-all cursor-pointer flex items-center justify-center gap-1.5 ${
                dashboardSection === 'indicar'
                  ? 'bg-[#ff6a00] text-white shadow-sm'
                  : 'text-orange-700 hover:text-orange-950 hover:bg-orange-50'
              }`}
            >
              <Gift className="w-4 h-4 shrink-0" />
              <span>Indicar e Ganhar</span>
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
              <CreditCard className="w-4 h-4 shrink-0" />
              <span>{isPromoZeroFeeActive ? 'Taxa 0%' : 'Comissões'}</span>
            </button>
            <button
              type="button"
              onClick={() => setDashboardSection('perfil')}
              className={`py-2.5 px-3 rounded-xl text-xs sm:text-sm font-heading font-black transition-all cursor-pointer flex items-center justify-center gap-1.5 col-span-2 sm:col-span-1 ${
                dashboardSection === 'perfil'
                  ? 'bg-amber-500 text-slate-950 shadow-sm'
                  : 'text-slate-600 hover:text-slate-950 hover:bg-white/60'
              }`}
            >
              <UserCheck className="w-4 h-4 shrink-0" />
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
                  (acceptedDriverRide || openIncomingRide) ? (
                    (() => {
                      const incomingRideSnapshot: Ride = (acceptedDriverRide || openIncomingRide)!;
                      const isAcceptedCall = Boolean(acceptedDriverRide);
                      const incomingPassengerAvatar = isAcceptedCall ? (incomingRideSnapshot.passengerAvatar || '') : '';
                      const incomingPassengerName = isAcceptedCall ? (incomingRideSnapshot.passengerName || 'Passageiro') : 'Passageiro RACE';
                      const incomingPassengerPhone = isAcceptedCall ? (incomingRideSnapshot.passengerPhone || '') : '';
                      const incomingPickupAddress = incomingRideSnapshot.pickup?.address || '';
                      const incomingDestAddress = incomingRideSnapshot.destination?.address || '';
                      const incomingPrice = incomingRideSnapshot.price || 0;
                      const incomingGrossFare = incomingRideSnapshot.originalPrice ?? incomingPrice;
                      const incomingSplit = calculateRideSplitForDriver(incomingGrossFare, currentDriver, incomingRideSnapshot.createdAt);
                      const incomingDriverEarns = incomingSplit.driverEarnings;
                      const isCashCall =
                        incomingRideSnapshot.paymentMethod === 'money' ||
                        incomingRideSnapshot.paymentMethod === 'dinheiro';

                      return (
                        <div className="bg-gradient-to-b from-white via-slate-50 to-slate-100 p-5 sm:p-6 rounded-3xl border-2 border-[#ff6a00] shadow-xl space-y-4">
                          {/* Banner Destacado para Corrida em DINHEIRO */}
                          {isCashCall && (
                            <div className="bg-emerald-600 text-white border-2 border-emerald-400 rounded-2xl p-4 text-center shadow-lg space-y-1">
                              <div className="text-lg sm:text-2xl font-heading font-black uppercase tracking-wider">
                                Pagamento em DINHEIRO - Receba {formatBRL(incomingPrice)} do passageiro
                              </div>
                              <p className="text-sm sm:text-base font-extrabold text-emerald-50">
                                Confirme o recebimento de {formatBRL(incomingPrice)} em espécie no final da corrida
                              </p>
                            </div>
                          )}

                          {/* Header da Chamada */}
                          <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3 border-b border-slate-200 pb-3.5">
                            <div className="flex items-center gap-2.5">
                              <span className="w-3.5 h-3.5 rounded-full bg-emerald-500 radar-pulse" />
                              <div>
                                <span className="bg-emerald-600 text-white font-heading font-black text-xs px-3 py-1 rounded-full uppercase tracking-wider shadow-sm">
                                  {isAcceptedCall ? 'Corrida Aceita! ' : 'Nova corrida! '}
                                  {formatBRL(incomingDriverEarns)} para você
                                </span>
                                <p className="text-xs text-slate-500 font-mono font-bold mt-0.5">
                                  {isCashCall ? 'PAGAMENTO: DINHEIRO • Chamado em tempo real' : 'Chamado em tempo real'}
                                </p>
                              </div>
                            </div>
                            <div className="text-right self-end sm:self-auto space-y-0.5">
                              <span className="text-2xl sm:text-3xl font-heading font-black text-[#ff6a00] block">
                                {formatBRL(incomingDriverEarns)}
                              </span>
                              <span className="text-xs font-bold text-emerald-700 bg-emerald-50 border border-emerald-300 px-2 py-0.5 rounded-full inline-block">
                                Total: {formatBRL(incomingPrice)} • {incomingSplit.driverSharePercent}% seu
                              </span>
                              <span className="text-[11px] font-mono text-slate-500 block">
                                Comissão Race {incomingSplit.commissionPercent}%: {formatBRL(incomingSplit.platformFee)}
                              </span>
                            </div>
                          </div>

                          {/* Card do Passageiro (dados pessoais só após aceitar) + Motorista na Chamada */}
                          <div className="bg-white rounded-2xl p-4 border border-slate-200 flex flex-col sm:flex-row sm:items-center justify-between gap-4 shadow-sm">
                            <div className="flex items-center gap-3.5 min-w-0">
                              <div className="relative shrink-0">
                                {incomingPassengerAvatar ? (
                                  <img
                                    src={incomingPassengerAvatar}
                                    alt={incomingPassengerName}
                                    className="w-16 h-16 sm:w-20 sm:h-20 rounded-full object-cover border-3 border-emerald-500 shadow-md"
                                  />
                                ) : (
                                  <div className="w-16 h-16 sm:w-20 sm:h-20 rounded-full bg-emerald-100 text-emerald-800 flex flex-col items-center justify-center font-heading font-black border-3 border-emerald-500 shadow-md">
                                    {isAcceptedCall ? (
                                      <span className="text-2xl leading-none">
                                        {incomingPassengerName.trim().charAt(0).toUpperCase()}
                                      </span>
                                    ) : null}
                                    <User className="w-6 h-6 opacity-80" />
                                  </div>
                                )}
                              </div>
                              <div className="min-w-0">
                                <span className="text-[10px] font-mono font-bold text-emerald-700 uppercase tracking-wider block">
                                  {isAcceptedCall ? 'Passageiro da Corrida' : 'Chamado na Região'}
                                </span>
                                <h5 className="font-heading font-black text-slate-950 text-base sm:text-xl truncate">
                                  {incomingPassengerName}
                                </h5>
                                {isAcceptedCall && incomingPassengerPhone ? (
                                  <p className="text-xs text-slate-600 font-mono mt-0.5">
                                    Contato: <span className="font-bold text-slate-900">{incomingPassengerPhone}</span>
                                  </p>
                                ) : !isAcceptedCall ? (
                                  <p className="text-xs text-slate-500 font-mono mt-0.5">
                                    Dados completos liberados ao aceitar
                                  </p>
                                ) : null}
                              </div>
                            </div>

                            <div className="flex items-center justify-between sm:justify-end gap-3">
                              {/* Foto redonda do Motorista + Placa do Veículo */}
                              <div className="flex items-center gap-2.5 bg-slate-50 border border-slate-200 rounded-2xl px-3 py-2">
                                {(currentDriver.avatar || currentUser?.avatar) ? (
                                  <img
                                    src={currentDriver.avatar || currentUser?.avatar}
                                    alt={currentDriver.name}
                                    className="w-12 h-12 rounded-full object-cover border-2 border-[#ff6a00] shrink-0"
                                  />
                                ) : (
                                  <div className="w-12 h-12 rounded-full bg-amber-100 text-amber-800 border-2 border-[#ff6a00] shrink-0 flex items-center justify-center font-heading font-black text-lg">
                                    {(currentDriver.name || 'M').trim().charAt(0).toUpperCase()}
                                  </div>
                                )}
                                <div className="min-w-0">
                                  <span className="text-[11px] font-heading font-black text-slate-900 block truncate max-w-[130px]">
                                    {currentDriver.name}
                                  </span>
                                  <span className="text-[11px] font-mono font-bold text-[#ff6a00] block">
                                    {currentDriver.vehiclePlate || 'Condutor'}
                                  </span>
                                </div>
                              </div>

                              {isAcceptedCall && incomingPassengerPhone && (
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
                              )}
                            </div>
                          </div>

                          {/* Endereço de Início e Chegada */}
                          <div className="bg-white rounded-2xl p-4 border border-slate-200 space-y-3 shadow-xs">
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

                          {/* Detalhes obrigatórios da modalidade */}
                          {incomingRideSnapshot.modalityDetails && (
                            <div className="bg-amber-50 border border-amber-300 rounded-2xl p-4 text-xs sm:text-sm text-slate-900 space-y-1.5 shadow-xs">
                              <span className="text-[11px] font-mono font-black uppercase text-amber-900 block">
                                Requisitos Confirmados pelo Passageiro
                              </span>
                              {normalizeRideCategory(incomingRideSnapshot.category) === 'moto_entrega' ? (
                                <div className="space-y-1 font-medium">
                                  <p>
                                    <strong>O que vai entregar:</strong> {incomingRideSnapshot.modalityDetails.deliveryDescription}
                                  </p>
                                  <p>
                                    <strong>Peso aproximado:</strong> {incomingRideSnapshot.modalityDetails.deliveryWeight}
                                  </p>
                                  <p>
                                    <strong>Quem recebe:</strong> {incomingRideSnapshot.modalityDetails.recipientName}
                                    {isAcceptedCall && incomingRideSnapshot.modalityDetails.recipientPhone
                                      ? ` (${incomingRideSnapshot.modalityDetails.recipientPhone})`
                                      : ' (contato liberado após aceitar)'}
                                  </p>
                                  <p>
                                    <strong>Quem paga:</strong>{' '}
                                    {incomingRideSnapshot.modalityDetails.whoPays === 'destinatario' ? 'Quem recebe' : 'Quem envia'}
                                  </p>
                                </div>
                              ) : normalizeRideCategory(incomingRideSnapshot.category) === 'moto_passageiro' ? (
                                <p className="font-bold text-cyan-900">
                                  • 1 passageiro • Capacete confirmado • Sem bagagem grande/mala
                                </p>
                              ) : incomingRideSnapshot.modalityDetails.passengerCount ? (
                                <p className="font-bold text-slate-900">
                                  • Quantidade de passageiros: {incomingRideSnapshot.modalityDetails.passengerCount}{' '}
                                  {incomingRideSnapshot.modalityDetails.passengerCount === 1 ? 'passageiro' : 'passageiros'}
                                </p>
                              ) : null}
                            </div>
                          )}

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
                              onClick={() => acceptIncomingRideHandler(incomingRideSnapshot)}
                              className="w-full sm:flex-1 min-h-[60px] bg-emerald-600 hover:bg-emerald-500 border-2 border-emerald-400 text-white font-heading font-black py-4 rounded-2xl text-base sm:text-lg transition-all cursor-pointer shadow-xl active:scale-95 text-center flex items-center justify-center gap-2 uppercase tracking-wider"
                            >
                              <CheckCircle2 className="w-6 h-6 shrink-0" />
                              <span>
                                {isCashCall
                                  ? `Aceitar (${formatBRL(incomingDriverEarns)} • DINHEIRO)`
                                  : `Aceitar (${formatBRL(incomingDriverEarns)})`}
                              </span>
                            </button>

                            {!acceptedDriverRide && (
                              <button
                                type="button"
                                onClick={() => rejectIncomingRideHandler(incomingRideSnapshot)}
                                className="w-full sm:w-auto min-h-[60px] px-5 py-4 bg-rose-600 hover:bg-rose-500 text-white rounded-2xl text-sm font-heading font-black cursor-pointer border-2 border-rose-400 flex items-center justify-center gap-2 shadow-md uppercase"
                              >
                                <XCircle className="w-5 h-5" />
                                <span>Recusar</span>
                              </button>
                            )}

                            <button
                              type="button"
                              onClick={() => acceptIncomingRideHandler(incomingRideSnapshot)}
                              className="w-full sm:w-auto px-4 py-4 bg-slate-950 hover:bg-zinc-800 text-white rounded-2xl text-xs sm:text-sm font-heading font-bold cursor-pointer border border-zinc-800 flex items-center justify-center gap-2 shadow-xs"
                            >
                              <Navigation className="w-4 h-4 text-emerald-400" />
                              <span>GPS</span>
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
                    <div className="text-center py-10 bg-slate-50 rounded-2xl border border-dashed border-slate-300 space-y-2">
                      <Car className="w-10 h-10 text-emerald-600 mx-auto" />
                      <p className="text-sm font-heading font-black text-slate-800">
                        Nenhuma corrida ainda
                      </p>
                      <p className="text-xs text-slate-500 max-w-sm mx-auto">
                        Você está ONLINE e pronto para atender. Assim que um passageiro confirmar uma corrida real no Supabase, o chamado aparecerá aqui.
                      </p>
                    </div>
                  )
                ) : !isApprovedDriver ? (
                  <div className="text-center py-8 text-amber-900 bg-amber-50 border border-amber-200 rounded-2xl p-4 text-sm space-y-1">
                    <p className="font-heading font-black uppercase">
                      {approvalStatus === 'reprovado'
                        ? 'Cadastro Reprovado pelo ADM'
                        : 'Aguardando Aprovação do Administrador'}
                    </p>
                    <p className="text-xs font-medium text-amber-800">
                      Seu radar de chamados será liberado assim que o ADM conferir sua CNH (frente e verso), CRLV e dados do veículo.
                    </p>
                  </div>
                ) : (
                  <div className="text-center py-8 text-slate-600 text-sm">
                    <p>Você está atualmente <strong className="text-rose-600">OFFLINE</strong>.</p>
                    <p className="mt-1 text-slate-500 font-medium">
                      Clique em "Ficar Online" no topo para receber novas corridas (85% para você, 15% Race).
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

                {rides.filter((r) => (currentDriver.id && r.driver?.id === currentDriver.id) || (currentDriver.email && r.driver?.email?.toLowerCase() === currentDriver.email.toLowerCase())).length === 0 ? (
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
                      .filter((r) => (currentDriver.id && r.driver?.id === currentDriver.id) || (currentDriver.email && r.driver?.email?.toLowerCase() === currentDriver.email.toLowerCase()))
                      .map((ride) => {
                        const rSplit = calculateRideSplitForDriver(ride.originalPrice ?? ride.price, currentDriver, ride.createdAt);
                        const driverEarns = rSplit.driverEarnings;
                        const raceCommission = rSplit.platformFee;
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
                                Ganho ({rSplit.driverSharePercent}%): {formatBRL(driverEarns)}
                              </span>
                              <span className="text-[10px] text-slate-500 font-mono block">
                                Race ({rSplit.commissionPercent}%): {formatBRL(raceCommission)}
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
            const totalReferralBonusesValue = referralBonuses.reduce(
              (acc, b) => acc + Number(b.valor || REFERRAL_BONUS_AMOUNT),
              0
            );
            const ownDriverRides = rides.filter(
              (r) =>
                (currentDriver.id && r.driver?.id === currentDriver.id) ||
                (currentDriver.email && r.driver?.email?.toLowerCase() === currentDriver.email.toLowerCase())
            );
            const computedRaceFee = isPromoZeroFeeActive
              ? 0
              : ownDriverRides.length > 0
              ? Number(
                  ownDriverRides
                    .reduce(
                      (acc, r) => acc + calculateRideSplitForDriver(r.originalPrice ?? r.price, currentDriver, r.createdAt).platformFee,
                      0
                    )
                    .toFixed(2)
                )
              : summary.gross > 0
              ? Number(((summary.gross / 0.85) * 0.15).toFixed(2))
              : 0;

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
                      {isPromoZeroFeeActive ? 'Taxa 0% Lançamento' : 'Corridas Pagas no App'}
                    </span>
                  </div>

                  <div>
                    <span className="text-xs text-zinc-400 font-medium block">Saldo Disponível:</span>
                    <div className="text-4xl sm:text-5xl font-heading font-black text-[#ff6a00] mt-1 tracking-tight">
                      {formatBRL(summary.gross)}
                    </div>
                    {isPromoZeroFeeActive ? (
                      <div className="mt-2 inline-flex items-center gap-2 px-3.5 py-2 rounded-xl bg-gradient-to-r from-orange-600/30 to-emerald-600/30 border border-orange-400/70 text-amber-100 text-xs sm:text-sm font-black">
                        <Sparkles className="w-4 h-4 text-[#ff6a00] shrink-0" />
                        <span>{LAUNCH_PROMO_EARNINGS_BADGE_TEXT}</span>
                      </div>
                    ) : (
                      <div className="mt-2 inline-flex items-center gap-1.5 px-3 py-1 rounded-xl bg-emerald-950/60 border border-emerald-500/40 text-emerald-300 text-xs font-bold">
                        <CheckCircle2 className="w-3.5 h-3.5 text-emerald-400 shrink-0" />
                        <span>Seu saldo: {formatBRL(summary.gross)} - Comissão Race 15% já descontada - Saque toda sexta</span>
                      </div>
                    )}
                    <p className="text-xs text-zinc-400 mt-2">
                      {isPromoZeroFeeActive
                        ? 'Sem mensalidade, sem taxa para trabalhar — você recebe 100% integral das corridas até 17/12/2026 (depois volta ao padrão 85% / 15%).'
                        : 'Você fica com 85% de cada corrida, Race fica com 15% - sem mensalidade, sem taxa para trabalhar.'}
                    </p>
                  </div>

                  {/* Divisão de Ganhos */}
                  <div className="bg-zinc-900/90 border border-zinc-700/80 rounded-2xl p-4 space-y-2">
                    <span className="text-[11px] font-bold text-amber-400 uppercase tracking-wider block">
                      {isPromoZeroFeeActive
                        ? 'Divisão de Ganhos: 100% para Você • 0% Race (até 17/12/2026)'
                        : 'Divisão de Ganhos: 85% para Você • 15% Race'}
                    </span>
                    <div className="grid grid-cols-2 gap-3 pt-1">
                      <div className="p-3 bg-black/40 rounded-xl border border-zinc-800">
                        <span className="text-[10px] text-zinc-400 uppercase font-bold block">
                          Seu Ganho Líquido ({isPromoZeroFeeActive ? '100%' : '85%'})
                        </span>
                        <span className="text-base sm:text-lg font-heading font-black text-emerald-400">{formatBRL(summary.gross)}</span>
                      </div>
                      <div className="p-3 bg-black/40 rounded-xl border border-zinc-800">
                        <span className="text-[10px] text-zinc-400 uppercase font-bold block">
                          Comissão Race ({isPromoZeroFeeActive ? '0%' : '15%'})
                        </span>
                        <span className="text-base sm:text-lg font-heading font-black text-amber-400">
                          {formatBRL(computedRaceFee)}
                        </span>
                      </div>
                    </div>
                  </div>

                  {/* Bônus de Indicação Recebidos */}
                  {referralBonuses.length > 0 && (
                    <div className="bg-emerald-950/50 border border-emerald-500/60 rounded-2xl p-4 space-y-2.5">
                      <div className="flex items-center justify-between">
                        <span className="text-xs font-heading font-black text-emerald-300 uppercase tracking-wider flex items-center gap-1.5">
                          <Gift className="w-4 h-4 text-[#ff6a00]" />
                          <span>Bônus de Indicação ({referralBonuses.length})</span>
                        </span>
                        <span className="text-xs font-mono font-black text-emerald-300">
                          +{formatBRL(totalReferralBonusesValue)}
                        </span>
                      </div>
                      <div className="space-y-2">
                        {referralBonuses.map((bonus, idx) => {
                          const meta = parseReferralBonusMeta(bonus.comprovante_url, bonus.chave_pix);
                          return (
                            <div
                              key={bonus.id || `bonus-${idx}`}
                              className="p-3 rounded-xl bg-black/40 border border-emerald-500/40 flex items-center justify-between gap-2 text-xs"
                            >
                              <span className="font-bold text-emerald-200">
                                {formatReferralBonusMessage(meta.indicatedName)}
                              </span>
                              <span className="font-mono font-black text-emerald-400 shrink-0">
                                +{formatBRL(Number(bonus.valor || REFERRAL_BONUS_AMOUNT))}
                              </span>
                            </div>
                          );
                        })}
                      </div>
                    </div>
                  )}

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
                              Valor Líquido ({isPromoZeroFeeActive ? '100%' : '85%'}): {formatBRL(w.netAmount)} &bull; Chave PIX: {w.pixKey}
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

          {/* SEÇÃO NOVA: INDICAR E GANHAR (R$50 POR INDICAÇÃO) */}
          {dashboardSection === 'indicar' && (() => {
            const myWhatsappRaw = currentDriver.phone || currentUser?.whatsapp || currentUser?.phone || '';
            const myWhatsappCode = normalizeReferralDigits(myWhatsappRaw) || currentUser?.email || currentDriver.email || '';
            const myPersonalCode = (
              driverReferralCode ||
              currentDriver.codigoIndicacao ||
              currentUser?.codigoIndicacao ||
              myWhatsappCode
            )
              .trim()
              .toUpperCase();
            const myReferralLink = buildReferralLink(myPersonalCode || myWhatsappCode);
            const unifiedShareText = buildReferralWhatsappShareText(myPersonalCode);
            const whatsappShareUrl = buildReferralWhatsappShareUrl(myPersonalCode);
            const countdownText = getLaunchPromoCountdownText();

            return (
              <div className="space-y-4">
                <LaunchPromoBanner />

                <div className="bg-gradient-to-br from-orange-600 via-orange-500 to-amber-500 text-white rounded-3xl p-5 sm:p-6 shadow-xl space-y-4">
                  <div className="flex items-start justify-between gap-3">
                    <div className="space-y-1.5">
                      <span className="text-[11px] font-black uppercase tracking-widest bg-black/25 px-3 py-1 rounded-full inline-block">
                        Indicação Premiada RACE • Quanto antes, mais tempo!
                      </span>
                      <h3 className="text-2xl sm:text-3xl font-heading font-black leading-tight">
                        Indicar e Ganhar R$ 50,00
                      </h3>
                      <p className="text-xs sm:text-sm font-semibold text-amber-50">
                        ⚡ LANÇAMENTO RACE! Sem taxa até 17/12/2026! Quanto antes você se cadastrar e indicar, mais tempo sem taxa e mais bônus você ganha! Indique agora e ganhe <strong>R$50</strong> por cada Motorista que fizer <strong>10 corridas</strong> até 17/12! Depois dessa data, volta para 15% de taxa.
                      </p>
                      <div className="inline-flex items-center gap-1.5 rounded-xl bg-black/30 border border-white/25 px-3 py-1.5 text-xs font-black text-amber-100">
                        <span>⏳ {countdownText}</span>
                      </div>
                    </div>
                    <div className="w-12 h-12 rounded-2xl bg-black/20 border border-white/30 flex items-center justify-center shrink-0">
                      <Gift className="w-6 h-6 text-white" />
                    </div>
                  </div>

                  {/* Código Grande em Destaque */}
                  <div className="bg-black/30 border-2 border-white/30 rounded-2xl p-4 sm:p-5 text-center space-y-3">
                    <span className="text-[11px] font-bold uppercase tracking-widest text-amber-100 block">
                      Seu Código de Indicação
                    </span>
                    <div className="text-4xl sm:text-5xl font-mono font-black tracking-[0.22em] text-white select-all py-1">
                      {myPersonalCode || '...'}
                    </div>
                    <p className="text-xs text-amber-100/95 font-medium break-words whitespace-pre-line bg-black/25 rounded-xl p-3 border border-white/15 text-left leading-relaxed">
                      {unifiedShareText}
                    </p>

                    <div className="flex flex-col gap-3 pt-1">
                      <button
                        type="button"
                        onClick={() => {
                          if (!myPersonalCode) return;
                          try {
                            navigator.clipboard.writeText(myPersonalCode);
                          } catch {}
                          setCopiedDriverCode(true);
                          setTimeout(() => setCopiedDriverCode(false), 3000);
                        }}
                        className="w-full py-3.5 px-4 rounded-xl bg-white text-orange-700 hover:bg-amber-50 font-heading font-black text-sm flex items-center justify-center gap-2 cursor-pointer shadow-lg transition-all active:scale-[0.98]"
                      >
                        {copiedDriverCode ? <Check className="w-4 h-4 text-emerald-600" /> : <Copy className="w-4 h-4" />}
                        <span>{copiedDriverCode ? 'Código copiado!' : 'Copiar código'}</span>
                      </button>

                      <a
                        href={whatsappShareUrl}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="w-full min-h-[60px] py-3 px-4 rounded-xl bg-[#25D366] hover:bg-[#1ebe5d] text-white font-heading font-bold text-[18px] leading-tight flex items-center justify-center gap-2.5 shadow-lg transition-all active:scale-[0.98]"
                      >
                        <MessageCircle className="w-6 h-6 shrink-0" />
                        <span>Compartilhar para Motorista, Motoboy e Passageiros</span>
                      </a>
                    </div>
                  </div>

                  <div className="bg-black/20 border border-white/20 rounded-2xl p-4 space-y-2">
                    <span className="text-[11px] font-bold uppercase tracking-wider text-amber-100 block">
                      Link Direto com Seu Código Preenchido
                    </span>
                    <div className="bg-black/40 rounded-xl px-3.5 py-2.5 font-mono text-xs sm:text-sm text-white break-all border border-white/15">
                      {myReferralLink}
                    </div>

                    <div className="flex flex-col sm:flex-row gap-2 pt-1">
                      <button
                        type="button"
                        onClick={() => {
                          try {
                            navigator.clipboard.writeText(myReferralLink);
                          } catch {}
                          setCopiedReferralLink(true);
                          setTimeout(() => setCopiedReferralLink(false), 3000);
                        }}
                        className="flex-1 py-2.5 px-4 rounded-xl bg-black/30 hover:bg-black/45 border border-white/30 text-white font-heading font-black text-xs flex items-center justify-center gap-2 cursor-pointer transition-all"
                      >
                        {copiedReferralLink ? <Check className="w-4 h-4 text-emerald-300" /> : <Copy className="w-4 h-4" />}
                        <span>{copiedReferralLink ? 'Link copiado!' : 'Copiar meu link'}</span>
                      </button>

                      {myWhatsappCode && (
                        <button
                          type="button"
                          onClick={() => {
                            try {
                              navigator.clipboard.writeText(myWhatsappCode);
                            } catch {}
                            setCopiedReferralWhatsapp(true);
                            setTimeout(() => setCopiedReferralWhatsapp(false), 3000);
                          }}
                          className="py-2.5 px-4 rounded-xl bg-black/30 hover:bg-black/45 border border-white/30 text-white font-heading font-black text-xs flex items-center justify-center gap-2 cursor-pointer transition-all"
                        >
                          {copiedReferralWhatsapp ? <Check className="w-4 h-4 text-emerald-300" /> : <Phone className="w-4 h-4" />}
                          <span>{copiedReferralWhatsapp ? 'WhatsApp copiado!' : 'Copiar WhatsApp'}</span>
                        </button>
                      )}
                    </div>
                  </div>
                </div>

                {/* Bônus já creditados */}
                {referralBonuses.length > 0 && (
                  <div className="bg-white border border-emerald-300 rounded-3xl p-5 shadow-md space-y-3">
                    <h4 className="font-heading font-black text-emerald-900 text-base flex items-center gap-2">
                      <CheckCircle2 className="w-5 h-5 text-emerald-600" />
                      <span>Meus Bônus de Indicação Creditados</span>
                    </h4>
                    <div className="space-y-2">
                      {referralBonuses.map((bonus, idx) => {
                        const meta = parseReferralBonusMeta(bonus.comprovante_url, bonus.chave_pix);
                        return (
                          <div
                            key={bonus.id || `ind-bonus-${idx}`}
                            className="p-3.5 rounded-2xl bg-emerald-50 border border-emerald-200 flex items-center justify-between gap-3"
                          >
                            <span className="text-xs sm:text-sm font-bold text-emerald-950">
                              {formatReferralBonusMessage(meta.indicatedName)}
                            </span>
                            <span className="font-mono font-black text-emerald-700 text-sm shrink-0">
                              +{formatBRL(Number(bonus.valor || REFERRAL_BONUS_AMOUNT))}
                            </span>
                          </div>
                        );
                      })}
                    </div>
                  </div>
                )}

                {/* Lista de indicados e progresso */}
                <div className="bg-white border border-slate-200 rounded-3xl p-5 sm:p-6 shadow-md space-y-3">
                  <div className="flex items-center justify-between border-b border-slate-100 pb-3">
                    <h4 className="font-heading font-black text-slate-950 text-base flex items-center gap-2">
                      <Users className="w-5 h-5 text-[#ff6a00]" />
                      <span>Motoristas / Motoboys Indicados ({referredDrivers.length})</span>
                    </h4>
                    <span className="text-xs font-mono font-bold text-slate-500">Meta: {REFERRAL_REQUIRED_RIDES} corridas</span>
                  </div>

                  {isLoadingReferrals ? (
                    <div className="py-6 text-center text-xs text-slate-500 flex items-center justify-center gap-2">
                      <Loader2 className="w-4 h-4 animate-spin text-[#ff6a00]" />
                      <span>Carregando suas indicações...</span>
                    </div>
                  ) : referredDrivers.length === 0 ? (
                    <div className="py-8 text-center bg-slate-50 rounded-2xl border border-dashed border-slate-300 p-4 space-y-1">
                      <Gift className="w-8 h-8 text-orange-400 mx-auto" />
                      <p className="text-sm font-bold text-slate-700">Nenhum motorista indicado ainda</p>
                      <p className="text-xs text-slate-500 max-w-sm mx-auto">
                        Copie seu link ou WhatsApp acima e envie para amigos motoristas e motoboys informarem no cadastro!
                      </p>
                    </div>
                  ) : (
                    <div className="space-y-3">
                      {referredDrivers.map((refDriver) => {
                        const pct = Math.min(100, Math.round((refDriver.ridesCount / REFERRAL_REQUIRED_RIDES) * 100));
                        return (
                          <div
                            key={refDriver.id}
                            className="p-4 rounded-2xl border border-slate-200 bg-slate-50 space-y-2"
                          >
                            <div className="flex items-center justify-between gap-2">
                              <div>
                                <p className="font-heading font-black text-slate-950 text-sm">
                                  {refDriver.nome}
                                </p>
                                <p className="text-[11px] font-mono text-slate-500">
                                  {refDriver.tipo === 'motoboy' ? 'Motoboy' : 'Motorista'} • {refDriver.ridesCount} / {REFERRAL_REQUIRED_RIDES} corridas finalizadas
                                </p>
                              </div>
                              {refDriver.bonusPaid ? (
                                <span className="px-2.5 py-1 rounded-full bg-emerald-100 text-emerald-800 border border-emerald-300 text-xs font-black shrink-0">
                                  ✓ Bônus +R$ 50 Pago!
                                </span>
                              ) : (
                                <span className="px-2.5 py-1 rounded-full bg-amber-100 text-amber-800 border border-amber-300 text-xs font-bold shrink-0">
                                  Faltam {Math.max(0, REFERRAL_REQUIRED_RIDES - refDriver.ridesCount)} corridas
                                </span>
                              )}
                            </div>
                            <div className="w-full h-2.5 bg-slate-200 rounded-full overflow-hidden">
                              <div
                                className={`h-full rounded-full transition-all ${
                                  refDriver.bonusPaid ? 'bg-emerald-500' : 'bg-[#ff6a00]'
                                }`}
                                style={{ width: `${pct}%` }}
                              />
                            </div>
                          </div>
                        );
                      })}
                    </div>
                  )}
                </div>
              </div>
            );
          })()}

          {/* SEÇÃO 3: COMISSÕES & PROMOÇÃO LANÇAMENTO */}
          {dashboardSection === 'assinatura' && (
            <div className="space-y-4">
              <div className="bg-white border border-slate-200 rounded-3xl p-6 shadow-md space-y-5">
                <div className="flex items-center justify-between border-b border-slate-200 pb-4 flex-wrap gap-2">
                  <div>
                    <span className={`text-xs font-bold px-2.5 py-0.5 rounded-full border uppercase tracking-wider inline-block mb-1 ${
                      isPromoZeroFeeActive
                        ? 'text-orange-700 bg-orange-50 border-orange-300'
                        : 'text-emerald-700 bg-emerald-50 border-emerald-200'
                    }`}>
                      {isPromoZeroFeeActive ? 'PROMOÇÃO LANÇAMENTO ATIVA' : 'MODELO OFICIAL RACE'}
                    </span>
                    <h3 className="font-heading font-black text-2xl text-slate-950">
                      {isPromoZeroFeeActive ? '100% para Você • 0% Race (até 17/12/2026)' : '85% para Você • 15% Race'}
                    </h3>
                  </div>
                  <span className="px-3 py-1 rounded-full text-xs font-heading font-black flex items-center gap-1.5 bg-emerald-100 text-emerald-800 border border-emerald-300">
                    <CheckCircle2 className="w-4 h-4 text-emerald-600" />
                    <span>SEM TAXA PARA TRABALHAR</span>
                  </span>
                </div>

                {isPromoZeroFeeActive && (
                  <div className="p-4 rounded-2xl bg-gradient-to-r from-orange-500 to-amber-500 text-white font-bold text-xs sm:text-sm shadow-sm flex items-center gap-2.5">
                    <Sparkles className="w-5 h-5 shrink-0" />
                    <span>{LAUNCH_PROMO_EARNINGS_BADGE_TEXT} Após 17/12/2026 retorna automaticamente para 85% Motorista / 15% Race.</span>
                  </div>
                )}

                <div className="bg-slate-50 p-4 sm:p-5 rounded-2xl border border-slate-200 space-y-3">
                  <div className="flex items-center justify-between text-sm">
                    <span className="text-slate-600 font-medium">Taxa para trabalhar / mensalidade:</span>
                    <span className="font-bold text-emerald-700">R$ 0,00 (Sem mensalidade)</span>
                  </div>
                  <div className="flex items-center justify-between text-sm">
                    <span className="text-slate-600 font-medium">Repasse líquido atual por corrida:</span>
                    <span className="font-black text-emerald-700">
                      {isPromoZeroFeeActive ? '100% do valor integral (Sem taxa até 17/12/2026)' : '85% do valor integral'}
                    </span>
                  </div>
                  <div className="flex items-center justify-between text-sm">
                    <span className="text-slate-600 font-medium">Comissão Race atual:</span>
                    <span className="font-bold text-amber-700">
                      {isPromoZeroFeeActive ? '0% até 17/12/2026 (depois 15%)' : '15% de intermediação'}
                    </span>
                  </div>
                  <div className="flex items-center justify-between text-sm">
                    <span className="text-slate-600 font-medium">Dia do Saque:</span>
                    <span className="font-bold text-slate-900">Toda sexta-feira via PIX</span>
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

                {driverProfileSuccessMsg && (
                  <div className="bg-emerald-50 border-2 border-emerald-500 text-emerald-950 rounded-2xl p-4 shadow-sm flex items-center justify-between gap-3">
                    <div className="flex items-center gap-2.5">
                      <CheckCircle2 className="w-5 h-5 text-emerald-600 shrink-0" />
                      <span className="font-heading font-black text-sm">{driverProfileSuccessMsg}</span>
                    </div>
                    <button
                      type="button"
                      onClick={() => setDriverProfileSuccessMsg(null)}
                      className="text-emerald-700 hover:text-emerald-950 p-1 rounded-lg cursor-pointer"
                    >
                      <X className="w-4 h-4" />
                    </button>
                  </div>
                )}

                {driverProfileErrorMsg && !isEditingDriverProfile && (
                  <div className="bg-rose-50 border-2 border-rose-500 text-rose-950 rounded-2xl p-3.5 shadow-sm flex items-center justify-between gap-2">
                    <span className="text-xs sm:text-sm font-bold">{driverProfileErrorMsg}</span>
                    <button
                      type="button"
                      onClick={() => setDriverProfileErrorMsg(null)}
                      className="text-rose-700 hover:text-rose-950 p-1 rounded-lg cursor-pointer shrink-0"
                    >
                      <X className="w-4 h-4" />
                    </button>
                  </div>
                )}

                <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 border-b border-slate-200 pb-4">
                  <div className="flex items-center gap-4">
                    <div 
                      onClick={() => driverAvatarInputRef.current?.click()}
                      className="relative group cursor-pointer shrink-0"
                    >
                      {((isEditingDriverProfile || hasPendingDriverAvatar ? (draftDriverAvatar || currentDriver.avatar || currentUser?.avatar) : (currentDriver.avatar || currentUser?.avatar))) ? (
                        <img
                          src={(isEditingDriverProfile || hasPendingDriverAvatar ? (draftDriverAvatar || currentDriver.avatar || currentUser?.avatar) : (currentDriver.avatar || currentUser?.avatar)) || ''}
                          alt={currentDriver.name}
                          className="w-20 h-20 rounded-full object-cover border-4 border-amber-500 shadow-md group-hover:opacity-90 transition-opacity"
                        />
                      ) : (
                        <div className="w-20 h-20 rounded-full bg-amber-100 text-amber-800 border-4 border-amber-500 shadow-md flex flex-col items-center justify-center font-heading font-black">
                          <span className="text-2xl leading-none">
                            {(currentDriver.name || 'M').trim().charAt(0).toUpperCase()}
                          </span>
                          <User className="w-4 h-4 opacity-75 mt-0.5" />
                        </div>
                      )}
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
                      {(driverReferralCode || currentDriver.codigoIndicacao || currentUser?.codigoIndicacao) && (
                        <div className="mt-2 inline-flex items-center gap-2 flex-wrap bg-orange-50 border border-orange-300 rounded-xl px-3 py-1">
                          <span className="text-xs font-bold text-slate-800">
                            Seu código de indicação:{' '}
                            <strong className="font-mono font-black text-[#ff6a00] tracking-wider">
                              {driverReferralCode || currentDriver.codigoIndicacao || currentUser?.codigoIndicacao}
                            </strong>
                          </span>
                          <button
                            type="button"
                            onClick={() => {
                              const code = driverReferralCode || currentDriver.codigoIndicacao || currentUser?.codigoIndicacao || '';
                              if (!code) return;
                              try { navigator.clipboard.writeText(code); } catch {}
                              setCopiedDriverCode(true);
                              setTimeout(() => setCopiedDriverCode(false), 2500);
                            }}
                            className="px-2 py-0.5 rounded-lg bg-[#ff6a00] hover:bg-[#e05e00] text-white font-heading font-black text-[11px] inline-flex items-center gap-1 cursor-pointer active:scale-95 transition-all"
                          >
                            {copiedDriverCode ? <Check className="w-3 h-3" /> : <Copy className="w-3 h-3" />}
                            <span>{copiedDriverCode ? 'Copiado!' : 'Copiar'}</span>
                          </button>
                        </div>
                      )}
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
                        <button
                          type="button"
                          onClick={handleOpenDriverProfileEdit}
                          className="text-xs font-heading font-black text-blue-600 hover:underline flex items-center gap-1 cursor-pointer"
                        >
                          <Pencil className="w-3 h-3" />
                          <span>Editar perfil</span>
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

                  {!isEditingDriverProfile && (
                    <button
                      type="button"
                      onClick={handleOpenDriverProfileEdit}
                      className="px-4 py-2 rounded-xl bg-emerald-600 hover:bg-emerald-500 text-white font-heading font-black text-xs flex items-center gap-1.5 shadow-xs cursor-pointer active:scale-95 shrink-0"
                    >
                      <Pencil className="w-3.5 h-3.5" />
                      <span>Editar perfil</span>
                    </button>
                  )}
                </div>

                {isEditingDriverProfile && (
                  <form
                    onSubmit={handleSaveDriverProfileChanges}
                    className="bg-slate-50 border-2 border-emerald-500 rounded-2xl p-4 sm:p-5 space-y-4 shadow-md animate-fade-in"
                  >
                    <div className="flex items-center justify-between border-b border-slate-200 pb-2.5">
                      <h4 className="font-heading font-black text-slate-950 text-base flex items-center gap-2">
                        <Pencil className="w-4 h-4 text-[#ff6a00]" />
                        <span>Editar Perfil do Condutor</span>
                      </h4>
                      <button
                        type="button"
                        onClick={handleCancelDriverProfileEdit}
                        className="px-3 py-1 rounded-xl bg-white border border-slate-300 text-slate-700 font-heading font-bold text-xs cursor-pointer"
                      >
                        Cancelar
                      </button>
                    </div>

                    <div className="bg-white border border-slate-200 rounded-2xl p-3.5 flex flex-col sm:flex-row items-center gap-4">
                      <div
                        onClick={() => driverAvatarInputRef.current?.click()}
                        className="relative cursor-pointer shrink-0"
                      >
                        {draftDriverAvatar ? (
                          <img
                            src={draftDriverAvatar}
                            alt="Prévia da foto"
                            className="w-20 h-20 rounded-full object-cover border-4 border-[#ff6a00] shadow"
                          />
                        ) : (
                          <div className="w-20 h-20 rounded-full bg-amber-100 text-amber-900 border-4 border-[#ff6a00] flex flex-col items-center justify-center font-heading font-black text-2xl">
                            <span>{(draftDriverName || currentDriver.name || 'M').charAt(0).toUpperCase()}</span>
                          </div>
                        )}
                      </div>
                      <div className="flex-1 text-center sm:text-left space-y-2">
                        {hasPendingDriverAvatar ? (
                          <span className="inline-flex items-center gap-1.5 text-xs font-heading font-black text-emerald-700 bg-emerald-100 border border-emerald-300 px-3 py-1 rounded-full">
                            <Check className="w-3.5 h-3.5" />
                            Prévia da nova foto pronta — clique em SALVAR ALTERAÇÕES
                          </span>
                        ) : (
                          <p className="text-xs font-bold text-slate-600">
                            Clique na foto para escolher uma imagem da galeria e ver a prévia antes de salvar.
                          </p>
                        )}
                        <div>
                          <button
                            type="button"
                            onClick={() => driverAvatarInputRef.current?.click()}
                            className="px-3.5 py-2 rounded-xl bg-slate-900 hover:bg-slate-800 text-white font-heading font-black text-xs inline-flex items-center gap-1.5 cursor-pointer"
                          >
                            <Camera className="w-3.5 h-3.5 text-[#ff6a00]" />
                            <span>{hasPendingDriverAvatar ? 'Escolher Outra Foto' : 'Escolher Foto na Galeria'}</span>
                          </button>
                        </div>
                      </div>
                    </div>

                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-3.5">
                      <div className="space-y-1">
                        <label className="text-xs font-heading font-black text-slate-700 uppercase block">
                          Nome Completo
                        </label>
                        <input
                          type="text"
                          value={draftDriverName}
                          onChange={(e) => setDraftDriverName(e.target.value)}
                          required
                          className="w-full px-3.5 py-2.5 rounded-xl bg-white border border-slate-300 focus:border-[#ff6a00] text-slate-950 font-bold text-sm outline-none"
                        />
                      </div>

                      <div className="space-y-1">
                        <label className="text-xs font-heading font-black text-slate-700 uppercase block">
                          E-mail
                        </label>
                        <input
                          type="email"
                          value={draftDriverEmail}
                          onChange={(e) => setDraftDriverEmail(e.target.value)}
                          required
                          className="w-full px-3.5 py-2.5 rounded-xl bg-white border border-slate-300 focus:border-[#ff6a00] text-slate-950 font-mono font-bold text-sm outline-none"
                        />
                      </div>

                      <div className="space-y-1">
                        <label className="text-xs font-heading font-black text-slate-700 uppercase block">
                          WhatsApp / Celular
                        </label>
                        <input
                          type="tel"
                          value={draftDriverPhone}
                          onChange={(e) => setDraftDriverPhone(e.target.value)}
                          className="w-full px-3.5 py-2.5 rounded-xl bg-white border border-slate-300 focus:border-[#ff6a00] text-slate-950 font-mono font-bold text-sm outline-none"
                        />
                      </div>

                      <div className="space-y-1">
                        <label className="text-xs font-heading font-black text-slate-500 uppercase block">
                          Login (não alterável)
                        </label>
                        <div className="w-full px-3.5 py-2.5 rounded-xl bg-slate-100 border border-slate-200 text-slate-600 font-mono font-bold text-sm">
                          {currentUser?.login || currentDriver.email}
                        </div>
                      </div>
                    </div>

                    {driverProfileErrorMsg && (
                      <div className="bg-rose-50 border border-rose-300 text-rose-900 rounded-xl p-3 text-xs font-bold">
                        {driverProfileErrorMsg}
                      </div>
                    )}

                    <button
                      type="submit"
                      disabled={isSavingDriverProfile}
                      className="w-full py-4 px-6 bg-emerald-600 hover:bg-emerald-500 active:scale-[0.99] text-white font-heading font-black text-base rounded-2xl shadow-lg shadow-emerald-600/25 flex items-center justify-center gap-2 uppercase tracking-wider cursor-pointer disabled:opacity-60"
                    >
                      {isSavingDriverProfile ? (
                        <>
                          <Loader2 className="w-5 h-5 animate-spin" />
                          <span>Salvando alterações...</span>
                        </>
                      ) : (
                        <>
                          <CheckCircle2 className="w-5 h-5" />
                          <span>SALVAR ALTERAÇÕES</span>
                        </>
                      )}
                    </button>
                  </form>
                )}

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
                      <div className="bg-slate-50 border border-slate-200 rounded-2xl p-3 text-xs text-slate-500 font-medium">
                        Nenhuma avaliação recebida ainda. As notas reais dos passageiros aparecerão aqui após as corridas.
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
                      <span className="text-xs text-slate-500 font-bold uppercase block">Carteira do Condutor</span>
                      <span className="text-xl font-heading font-black text-slate-900 block">
                        Seu saldo: R$ {walletSummary.gross.toFixed(2)}
                      </span>
                      <span className="text-xs text-emerald-700 font-bold block mt-0.5">
                        Comissão Race 15% já descontada - Saque toda sexta
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
                    <span className="font-mono font-black text-amber-700">{currentDriver.vehiclePlate || 'Não informada'}</span>
                  </div>
                  <div className="bg-slate-50 p-3.5 rounded-2xl border border-slate-200 flex items-center justify-between gap-2">
                    <div>
                      <span className="text-[11px] font-bold text-slate-500 uppercase block">Modalidade / Categoria</span>
                      <span className="font-bold text-slate-900 capitalize">
                        {currentDriver.category === 'economica'
                          ? 'Motorista Econômico'
                          : currentDriver.category === 'confort'
                          ? 'Motorista Confort'
                          : currentDriver.category === 'moto_passageiro'
                          ? 'Motoboy Passageiro'
                          : currentDriver.category === 'moto_entrega'
                          ? 'Motoboy Entregas'
                          : String(currentDriver.category || '').replace('_', ' ')}
                      </span>
                    </div>
                    <button
                      type="button"
                      onClick={() => {
                        setDashboardSection('corridas');
                        setIsEditingCategory(true);
                      }}
                      className="text-xs font-black bg-[#ff6a00]/10 hover:bg-[#ff6a00]/20 text-[#ff6a00] px-3 py-1.5 rounded-xl border border-[#ff6a00]/30 transition-colors cursor-pointer shrink-0"
                    >
                      Trocar modalidade
                    </button>
                  </div>
                  <div className="bg-slate-50 p-3.5 rounded-2xl border border-slate-200">
                    <span className="text-[11px] font-bold text-slate-500 uppercase block">Cor do Veículo</span>
                    <span className="font-bold text-slate-900">{currentDriver.vehicleColor || 'Não informada'}</span>
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
                          Número: {currentDriver.cnh || 'Não informado'}
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
            </>
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
                onClick={() => setIsForgotPasswordOpen(true)}
                className="text-xs font-bold text-zinc-300 hover:text-[#ff6a00] underline underline-offset-4 transition-colors cursor-pointer"
              >
                Esqueci a senha
              </button>
            </div>

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
                  85% seu • 15% Race
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
                    <span className="text-xs font-heading font-black text-emerald-700">85% para Você</span>
                  </div>
                </div>
              </div>

              {/* 3 Blocos Rápidos: Remuneração, Modelo e Área */}
              <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
                <div className="bg-white p-4 rounded-2xl border border-slate-200 space-y-1">
                  <div className="flex items-center gap-2 text-emerald-700 font-heading font-black text-xs uppercase">
                    <DollarSign className="w-4 h-4" />
                    <span>Você Fica com 85%</span>
                  </div>
                  <p className="text-xs text-slate-700 font-medium">
                    {selectedGuide.earningsDescription}
                  </p>
                </div>

                <div className="bg-white p-4 rounded-2xl border border-slate-200 space-y-1">
                  <div className="flex items-center gap-2 text-[#ff6a00] font-heading font-black text-xs uppercase">
                    <QrCode className="w-4 h-4" />
                    <span>Sem Taxa Para Trabalhar</span>
                  </div>
                  <p className="text-xs text-slate-700 font-medium">
                    <strong>Você fica com 85% de cada corrida, Race fica com 15%</strong> - sem mensalidade, sem taxa para trabalhar. Saque toda sexta-feira.
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
                    <span>Motorista Confort - Requisitos (Mínimo 2020)</span>
                  </div>
                  <p className="text-xs text-purple-950 font-medium">
                    <strong>Automóvel a partir de 2020</strong> (até 5 anos de uso): <strong>SUV, Sedã ou Hatch Premium</strong> (Corolla, Civic, T-Cross, Creta, Compass, Nivus, Virtus, Onix Plus). <strong>NÃO aceita carro popular 1.0 básico</strong>. Avaliação mínima <strong>4.8</strong> para continuar no Confort.
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

                {/* Modelo de Repasse Oficial Race */}
                <div className="bg-white border-2 border-emerald-300 rounded-2xl p-4 max-w-md mx-auto text-left space-y-2 shadow-xs">
                  <div className="flex items-center justify-between text-xs font-heading font-black text-slate-700">
                    <span>MODELO OFICIAL RACE</span>
                    <span className="text-emerald-700 font-mono">85% seu • 15% Race</span>
                  </div>
                  <p className="text-xs text-slate-700 font-medium">
                    Você fica com 85% de cada corrida, Race fica com 15% - sem mensalidade, sem taxa para trabalhar.
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
                    <span>VER DETALHES DE COMISSÃO 85%/15%</span>
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

                  <div className="flex items-center gap-3 bg-white border border-slate-300 rounded-xl p-3">
                    <label className="w-12 h-12 rounded-full bg-slate-100 border-2 border-amber-500 flex items-center justify-center overflow-hidden cursor-pointer shrink-0">
                      {regAvatar ? (
                        <img src={regAvatar} alt="Foto do condutor" className="w-full h-full object-cover" />
                      ) : (
                        <Camera className="w-5 h-5 text-amber-700" />
                      )}
                      <input type="file" accept="image/*" onChange={handleRegAvatarUpload} className="hidden" />
                    </label>
                    <div className="text-xs">
                      <span className="font-bold text-slate-900 block">Foto de Perfil * (Obrigatória)</span>
                      <span className="text-slate-600">{regAvatar ? 'Foto anexada com sucesso' : 'Toque ao lado para enviar sua foto'}</span>
                    </div>
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
                        Sua Chave PIX Pessoal (para receber seus 85%)
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
                          <option value="Baú 90 Litros">Baú 90 Litros (Mínimo Entregas)</option>
                          <option value="Baú 100 Litros">Baú 100 Litros</option>
                          <option value="Baú 120 Litros">Baú 120 Litros</option>
                          <option value="Baú 135 Litros">Baú 135 Litros</option>
                        </select>
                      </div>
                    )}
                  </div>

                  {/* Fotos Obrigatórias: CNH (Frente), CNH (Verso) e CRLV */}
                  <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 pt-2">
                    <label className={`flex flex-col items-center justify-center p-3.5 rounded-2xl border-2 border-dashed cursor-pointer text-center gap-2 transition-colors ${regCnhFrontPhoto ? 'bg-emerald-50 border-emerald-400' : 'bg-white border-slate-300 hover:border-amber-500'}`}>
                      <input
                        type="file"
                        accept="image/*"
                        className="hidden"
                        onChange={(e) => handleRegDocPhotoUpload(e, setRegCnhFrontPhoto)}
                      />
                      {regCnhFrontPhoto ? (
                        <>
                          <img src={regCnhFrontPhoto} alt="CNH Frente" className="w-full h-24 object-cover rounded-xl" />
                          <span className="text-xs font-bold text-emerald-700">CNH (Frente) ✓</span>
                        </>
                      ) : (
                        <>
                          <Camera className="w-5 h-5 text-amber-600" />
                          <span className="text-xs font-bold text-slate-800">Foto da CNH (Frente) *</span>
                          <span className="text-[11px] text-rose-600 font-bold">Obrigatória</span>
                        </>
                      )}
                    </label>

                    <label className={`flex flex-col items-center justify-center p-3.5 rounded-2xl border-2 border-dashed cursor-pointer text-center gap-2 transition-colors ${regCnhBackPhoto ? 'bg-emerald-50 border-emerald-400' : 'bg-white border-slate-300 hover:border-amber-500'}`}>
                      <input
                        type="file"
                        accept="image/*"
                        className="hidden"
                        onChange={(e) => handleRegDocPhotoUpload(e, setRegCnhBackPhoto)}
                      />
                      {regCnhBackPhoto ? (
                        <>
                          <img src={regCnhBackPhoto} alt="CNH Verso" className="w-full h-24 object-cover rounded-xl" />
                          <span className="text-xs font-bold text-emerald-700">CNH (Verso) ✓</span>
                        </>
                      ) : (
                        <>
                          <Camera className="w-5 h-5 text-amber-600" />
                          <span className="text-xs font-bold text-slate-800">Foto da CNH (Verso) *</span>
                          <span className="text-[11px] text-rose-600 font-bold">Obrigatória</span>
                        </>
                      )}
                    </label>

                    <label className={`flex flex-col items-center justify-center p-3.5 rounded-2xl border-2 border-dashed cursor-pointer text-center gap-2 transition-colors ${regCrlvPhoto ? 'bg-emerald-50 border-emerald-400' : 'bg-white border-slate-300 hover:border-amber-500'}`}>
                      <input
                        type="file"
                        accept="image/*"
                        className="hidden"
                        onChange={(e) => handleRegDocPhotoUpload(e, setRegCrlvPhoto)}
                      />
                      {regCrlvPhoto ? (
                        <>
                          <img src={regCrlvPhoto} alt="CRLV" className="w-full h-24 object-cover rounded-xl" />
                          <span className="text-xs font-bold text-emerald-700">CRLV do Veículo ✓</span>
                        </>
                      ) : (
                        <>
                          <Camera className="w-5 h-5 text-amber-600" />
                          <span className="text-xs font-bold text-slate-800">Foto do CRLV *</span>
                          <span className="text-[11px] text-rose-600 font-bold">Obrigatória</span>
                        </>
                      )}
                    </label>
                  </div>

                  {/* Alerta em tempo real de ano mínimo por modalidade */}
                  {(() => {
                    const y = parseInt(regYear, 10);
                    if (!regYear || Number.isNaN(y)) return null;
                    if (regCategory === 'economica' && y < 2015) {
                      return (
                        <div className="bg-rose-50 border-2 border-rose-400 text-rose-950 text-xs sm:text-sm p-3.5 rounded-2xl font-bold flex items-center gap-2">
                          <AlertTriangle className="w-5 h-5 text-rose-600 shrink-0" />
                          <span>Seu veículo não atende aos requisitos de Motorista Econômico (mínimo 2015). Escolha outra modalidade ou cadastre outro veículo.</span>
                        </div>
                      );
                    }
                    if (regCategory === 'moto_passageiro' && y < 2018) {
                      return (
                        <div className="bg-rose-50 border-2 border-rose-400 text-rose-950 text-xs sm:text-sm p-3.5 rounded-2xl font-bold flex items-center gap-2">
                          <AlertTriangle className="w-5 h-5 text-rose-600 shrink-0" />
                          <span>Sua moto não atende aos requisitos de Motoboy Passageiro (mínimo 2018, 150cc+). Escolha outra modalidade ou cadastre outra moto.</span>
                        </div>
                      );
                    }
                    if (regCategory === 'moto_entrega' && y < 2015) {
                      return (
                        <div className="bg-rose-50 border-2 border-rose-400 text-rose-950 text-xs sm:text-sm p-3.5 rounded-2xl font-bold flex items-center gap-2">
                          <AlertTriangle className="w-5 h-5 text-rose-600 shrink-0" />
                          <span>Sua moto não atende aos requisitos de Motoboy Entregas (mínimo 2015, 125cc+). Cadastre uma moto a partir de 2015.</span>
                        </div>
                      );
                    }
                    return null;
                  })()}

                  {/* Validador Visual do Modelo Confort em Tempo Real */}
                  {regCategory === 'confort' && (
                    <div
                      className={`p-4 rounded-2xl border-2 transition-all space-y-1.5 ${
                        comfortCheck.eligible
                          ? 'bg-emerald-50 border-emerald-400 text-emerald-950'
                          : 'bg-rose-50 border-rose-400 text-rose-950'
                      }`}
                    >
                      <div className="flex items-center justify-between">
                        <div className="flex items-center gap-2">
                          {comfortCheck.eligible ? (
                            <CheckCircle2 className="w-5 h-5 text-emerald-600 shrink-0" />
                          ) : (
                            <AlertTriangle className="w-5 h-5 text-rose-600 shrink-0" />
                          )}
                          <span className="font-heading font-black text-sm sm:text-base">
                            {comfortCheck.eligible
                              ? 'VEÍCULO APROVADO PARA O MODELO CONFORT'
                              : 'VEÍCULO NÃO ATENDE EXIGÊNCIAS DO CONFORT'}
                          </span>
                        </div>
                        <span className="text-xs font-mono font-bold px-2 py-0.5 rounded bg-white border shadow-sm">
                          Ano mínimo: {comfortCheck.minYearRequired}+
                        </span>
                      </div>

                      <p className="text-xs sm:text-sm font-medium">
                        {comfortCheck.feedbackMessage}
                      </p>
                    </div>
                  )}

                  {/* Checkbox Obrigatório de Confirmação das Exigências */}
                  <label className="bg-amber-50 border-2 border-amber-400 rounded-xl p-3.5 flex items-start gap-3 cursor-pointer">
                    <input
                      type="checkbox"
                      checked={regRequirementsConfirmed}
                      onChange={(e) => setRegRequirementsConfirmed(e.target.checked)}
                      className="mt-0.5 w-4 h-4 text-emerald-600 rounded border-amber-500 cursor-pointer shrink-0"
                    />
                    <span className="text-xs sm:text-sm text-slate-950 font-black cursor-pointer">
                      Li e confirmo que meu veículo atende a todas as exigências acima
                    </span>
                  </label>
                </div>

                {/* Selo de Auditoria e Criptografia */}
                <div className="bg-slate-50 p-4 rounded-xl border border-slate-200 flex flex-col sm:flex-row sm:items-center justify-between gap-2 text-xs sm:text-sm text-slate-700 font-medium">
                  <div className="flex items-center gap-2.5">
                    <ShieldCheck className="w-5 h-5 text-emerald-600 shrink-0" />
                    <span>Auditoria automática de antecedentes criminais, dados veiculares e CNH válida</span>
                  </div>
                  <span className="text-xs text-emerald-700 font-bold bg-emerald-50 px-2.5 py-0.5 rounded border border-emerald-200 shrink-0">
                    Criptografia Segura
                  </span>
                </div>

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

                {regError && (
                  <div className="bg-rose-50 border-2 border-rose-400 text-rose-800 text-sm p-4 rounded-2xl font-bold flex flex-col gap-2">
                    <div className="flex items-center gap-2">
                      <AlertTriangle className="w-5 h-5 text-rose-600 shrink-0" />
                      <span>{regError}</span>
                    </div>
                    {(regError.includes('cadastrado') || regError.includes('Entrar')) && (
                      <div className="flex flex-wrap gap-2 pl-7">
                        <button
                          type="button"
                          onClick={() => {
                            setLoginEmail(regEmail.replace(/\s+/g, '').trim().toLowerCase());
                            setActiveSubTab('login');
                            setRegError(null);
                          }}
                          className="text-xs px-3 py-1.5 rounded-lg bg-rose-700 hover:bg-rose-800 text-white font-bold cursor-pointer"
                        >
                          Ir para Entrar
                        </button>
                        <button
                          type="button"
                          onClick={() => setIsForgotPasswordOpen(true)}
                          className="text-xs px-3 py-1.5 rounded-lg bg-white border border-rose-300 text-rose-800 hover:bg-rose-100 font-bold cursor-pointer"
                        >
                          Esqueci minha senha
                        </button>
                      </div>
                    )}
                  </div>
                )}

                {/* Botão de Finalização com Categoria Específica */}
                <button
                  type="submit"
                  disabled={isRegistering}
                  className={`w-full font-heading font-black py-4 px-6 rounded-2xl transition-all text-sm sm:text-base border uppercase tracking-wider ${
                    isRegistering
                      ? 'bg-slate-300 text-slate-600 border-slate-400 cursor-not-allowed opacity-80'
                      : !regRequirementsConfirmed || !acceptedContract || !acceptedTerms || !acceptedLgpd || !acceptedPrivacy
                      ? 'bg-amber-100 hover:bg-amber-200 text-amber-950 border-amber-500 cursor-pointer'
                      : 'bg-blue-600 hover:bg-blue-500 text-white cursor-pointer shadow-lg shadow-blue-600/25 border-blue-500 active:scale-[0.99]'
                  }`}
                >
                  {isRegistering
                    ? 'VERIFICANDO E ENVIANDO PARA APROVAÇÃO...'
                    : regRequirementsConfirmed && acceptedContract && acceptedTerms && acceptedLgpd && acceptedPrivacy
                    ? `Enviar cadastro para aprovação (${selectedGuide.title})`
                    : 'Marque os 4 documentos para trabalhar'}
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
                  Você fica com 85% de cada corrida, Race fica com 15% - sem mensalidade, sem taxa para trabalhar.
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



      {/* Modal de Navegação GPS com Card Fixo da Corrida embaixo para o Condutor */}
      {isDriverGpsOpen && (
        <DriverGpsNavigationModal
          driver={currentDriver}
          ride={acceptedDriverRide || activeRide}
          onClose={() => setIsDriverGpsOpen(false)}
          onOpenSupport={onOpenSupport}
          onCancelRide={() => {
            const rid = acceptedDriverRide?.id || activeRide?.id;
            if (rid) updateCorridaStatusSupabase(rid, 'cancelada').catch(() => {});
            setIsDriverGpsOpen(false);
            setAcceptedDriverRide(null);
            setAcceptedRideNotice('Corrida cancelada.');
          }}
          onCompleteRide={(finishedRide) => {
            const targetRide = finishedRide || acceptedDriverRide || activeRide;
            const rid = targetRide?.id;
            const isCash =
              targetRide?.paymentMethod === 'money' || targetRide?.paymentMethod === 'dinheiro';
            const totalRideVal = targetRide?.price || 0;
            const grossFareForSplit = targetRide?.originalPrice ?? totalRideVal;
            const split = calculateRideSplitForDriver(grossFareForSplit, currentDriver, targetRide?.createdAt);
            const driverEarns = split.driverEarnings;
            const raceCommission = split.platformFee;
            const didPassengerNotPay = Boolean(finishedRide?.nonPaymentReported);
            let updatedWalletSaldo = getDriverBalance(currentDriver.id, currentDriver.walletBalance || 0);

            if (isCash && didPassengerNotPay && targetRide) {
              reportPassengerCashNonPaymentSupabase({
                ride: targetRide,
                driver: currentDriver,
              }).catch(() => {});
              updatedWalletSaldo = addDriverEarnings(currentDriver.id, driverEarns);
              syncDriverWalletSaldoSupabase({
                driverId: currentDriver.id,
                driverEmail: currentDriver.email,
                saldo: updatedWalletSaldo,
              }).catch(() => {});
              if (onTriggerToast) {
                onTriggerToast(
                  `Calote registrado • ${split.driverSharePercent}% garantido!`,
                  `Dívida de ${formatBRL(totalRideVal)} registrada no passageiro. A Race garante seu repasse de ${split.driverSharePercent}% (${formatBRL(driverEarns)}) na sexta-feira mesmo assim!`,
                  'financial'
                );
              }
            } else {
              if (rid) {
                updateCorridaStatusSupabase(
                  rid,
                  'finalizada',
                  isCash ? 'dinheiro' : undefined,
                  {
                    valor_motorista: driverEarns,
                    valor_race: raceCommission,
                  }
                ).catch(() => {});
              }
              if (!isCash && driverEarns > 0) {
                updatedWalletSaldo = addDriverEarnings(currentDriver.id, driverEarns);
                syncDriverWalletSaldoSupabase({
                  driverId: currentDriver.id,
                  driverEmail: currentDriver.email,
                  saldo: updatedWalletSaldo,
                }).catch(() => {});
              }
            }

            checkAndAwardReferralBonusSupabase({
              driverId: currentDriver.id,
              driverEmail: currentDriver.email,
            }).catch(() => {});
            if (targetRide?.passengerId || targetRide?.passengerEmail) {
              checkAndAwardReferralBonusSupabase({
                userId: targetRide.passengerId,
                userEmail: targetRide.passengerEmail,
              }).catch(() => {});
            }

            onUpdateDriver({
              ...currentDriver,
              walletBalance: updatedWalletSaldo,
              earningsToday: currentDriver.earningsToday + driverEarns,
              earningsWeek: currentDriver.earningsWeek + driverEarns,
              totalRides: currentDriver.totalRides + 1,
            });
            setAcceptedRideNotice(
              isCash
                ? didPassengerNotPay
                  ? `Passageiro NÃO pagou (${formatBRL(totalRideVal)}). Dívida bloqueou o passageiro no app e a Race paga seus ${split.driverSharePercent}% (${formatBRL(driverEarns)}) na sexta-feira mesmo assim!`
                  : `Corrida finalizada! Recebido ${formatBRL(totalRideVal)} em dinheiro do passageiro (Comissão Race ${split.commissionPercent}%: ${formatBRL(raceCommission)}).`
                : `Corrida finalizada! Você recebeu ${formatBRL(driverEarns)} (${split.driverSharePercent}% líquido).`
            );
            setAcceptedDriverRide(null);
            setIsDriverGpsOpen(false);
          }}
        />
      )}

      {/* Modal Esqueci a senha */}
      <ForgotPasswordModal
        isOpen={isForgotPasswordOpen}
        onClose={() => setIsForgotPasswordOpen(false)}
        initialIdentifier={loginEmail}
        onPasswordResetSuccess={(resolvedIdentifier, successMessage) => {
          setLoginFeedback(null);
          setLoginEmail(resolvedIdentifier);
          setLoginPassword('');
          setLoginSuccessNotice(successMessage);
          setActiveSubTab('login');
        }}
      />
    </div>
  );
};
