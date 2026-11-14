import React, { useState, useEffect, useRef } from 'react';
import { 
  AppUser,
  Driver, 
  LocationPoint, 
  Ride, 
  VehicleCategory 
} from '../types';
import { VEHICLE_CATEGORIES, calculateFare, formatBRL, generateUniqueRideConfirmationCode } from '../services/pricingService';
import { FINAL_RIDE_MESSAGE, WEEKLY_FEE_TEXT } from '../config/pricing';
import { 
  searchAddressAutocomplete, 
  calculateDistanceKm, 
  reverseGeocodeCoords,
  hasAddressNumber,
  extractAddressNumber,
  AddressSuggestion, 
  POPULAR_DATABASE_LOCATIONS 
} from '../services/addressSearchService';
import { 
  Car, 
  Sparkles, 
  Bike, 
  PackageCheck, 
  MapPin, 
  Navigation, 
  Clock, 
  CreditCard, 
  QrCode, 
  Wallet, 
  CheckCircle2, 
  ShieldCheck, 
  Star, 
  Phone, 
  Lock,
  Search,
  Loader2,
  Crosshair,
  X,
  Zap,
  ArrowRight,
  Power,
  Maximize2,
  AlertTriangle,
  Route,
  Volume2,
  VolumeX,
  ArrowLeft,
  Copy,
  Check,
  ExternalLink
} from 'lucide-react';
import confetti from 'canvas-confetti';
import {
  isAudioEnabled,
  toggleAudio,
  notifyDriverArrived,
  notifyRideFinished
} from '../services/audioNotificationService';
import {
  createAsaasPixPayment,
  createAsaasCardPayment,
  payAsaasPaymentWithCreditCard,
  checkAsaasPaymentStatus,
  generateFallbackPixCopiaECola,
  AsaasPaymentResult,
} from '../services/asaasService';

interface PassengerRideViewProps {
  onStartRide: (ride: Ride) => void;
  activeRide: Ride | null;
  onCancelRide: () => void;
  onCompleteRide: () => void;
  onSubmitRating: (rating: number, comment: string) => void;
  pickup: LocationPoint | null;
  destination: LocationPoint | null;
  setPickup: (p: LocationPoint | null) => void;
  setDestination: (d: LocationPoint | null) => void;
  onSelectOnMap: (type: 'pickup' | 'destination') => void;
  availableDrivers: Driver[];
  mapElement?: React.ReactNode;
  currentUser?: AppUser | null;
  currentDriver?: Driver;
  loginSuccessBanner?: string | null;
  onClearLoginBanner?: () => void;
  onOpenFullMap?: () => void;
  passengerDebt?: {
    debtAmount: number;
    isBlocked: boolean;
    unpaidRideIds: string[];
  };
  onClearPassengerDebt?: (
    asaasPaymentId: string,
    asaasStatus: 'RECEIVED' | 'CONFIRMED'
  ) => Promise<void> | void;
}

export const PassengerRideView: React.FC<PassengerRideViewProps> = ({
  onStartRide,
  activeRide,
  onCancelRide,
  onCompleteRide,
  onSubmitRating,
  pickup,
  destination,
  setPickup,
  setDestination,
  onSelectOnMap,
  availableDrivers,
  mapElement,
  currentUser,
  currentDriver,
  loginSuccessBanner,
  onClearLoginBanner,
  onOpenFullMap,
  passengerDebt,
  onClearPassengerDebt,
}) => {
  const [selectedCategory, setSelectedCategory] = useState<VehicleCategory>('economica');
  const [paymentMethod, setPaymentMethod] = useState<'pix' | 'credit_card' | 'money' | 'dinheiro' | 'race_pay'>('pix');
  const [pickupInput, setPickupInput] = useState(pickup?.address || '');
  const [destInput, setDestInput] = useState(destination?.address || '');

  const isCashMethod = (m?: string) => m === 'money' || m === 'dinheiro';
  const isRideMapAllowed = Boolean(
    activeRide && (activeRide.paymentStatus === 'paid' || isCashMethod(activeRide.paymentMethod))
  );

  // Estados do Fluxo do Passageiro:
  // 1. 'search': Entrada dos endereços de embarque e destino com número + botão "Buscar corrida"
  // 2. 'options': Mostra as 4 opções com VALOR FINAL (Econômico R$ 8,00, Confort R$ 11,20, Motoboy R$ 6,16, Entregas R$ 6,90)
  // 3. 'payment': Página de Pagamento ("Você escolheu [Categoria] - R$ [Valor]") com PIX/Cartão e botão "Pagar", depois "Confirmar corrida"
  const [passengerStep, setPassengerStep] = useState<'search' | 'options' | 'payment'>('search');
  const [isPaidInApp, setIsPaidInApp] = useState(false);
  const [isProcessingPayment, setIsProcessingPayment] = useState(false);
  const [pixCopied, setPixCopied] = useState(false);
  const [rideCodeCopied, setRideCodeCopied] = useState(false);

  // Estados Asaas (somente libera após RECEIVED ou CONFIRMED real)
  const [asaasPayment, setAsaasPayment] = useState<AsaasPaymentResult | null>(null);
  const [asaasConfirmedStatus, setAsaasConfirmedStatus] = useState<
    'PENDING' | 'RECEIVED' | 'CONFIRMED' | 'OVERDUE' | 'REFUNDED'
  >('PENDING');
  const [paymentBlockedError, setPaymentBlockedError] = useState<string | null>(null);
  const [isLoadingAsaas, setIsLoadingAsaas] = useState(false);
  const [isPollingAsaas, setIsPollingAsaas] = useState(false);
  const [cardHolder, setCardHolder] = useState('');
  const [cardNumber, setCardNumber] = useState('');
  const [cardExpiry, setCardExpiry] = useState('');
  const [cardCvv, setCardCvv] = useState('');
  const [cardHolderCpf, setCardHolderCpf] = useState('');
  const [cardHolderCep, setCardHolderCep] = useState('');
  const pollingTimerRef = useRef<any>(null);

  // Estados de quitação de dívida de corrida em dinheiro não paga (PIX Asaas obrigatório)
  const [asaasDebtPayment, setAsaasDebtPayment] = useState<AsaasPaymentResult | null>(null);
  const [asaasDebtStatus, setAsaasDebtStatus] = useState<'PENDING' | 'RECEIVED' | 'CONFIRMED'>('PENDING');
  const [isLoadingDebtAsaas, setIsLoadingDebtAsaas] = useState(false);
  const [isDebtPaid, setIsDebtPaid] = useState(false);
  const [debtPixCopied, setDebtPixCopied] = useState(false);
  const [isClearingDebt, setIsClearingDebt] = useState(false);
  const debtPollingRef = useRef<any>(null);

  const hasOpenDebt = Boolean(passengerDebt?.isBlocked && (passengerDebt?.debtAmount || 0) > 0);

  // Address validation banner state
  const [addressValidationError, setAddressValidationError] = useState<string | null>(null);

  // Automatic search and suggestions state
  const [pickupSuggestions, setPickupSuggestions] = useState<AddressSuggestion[]>([]);
  const [destSuggestions, setDestSuggestions] = useState<AddressSuggestion[]>([]);
  const [activeDropdown, setActiveDropdown] = useState<'pickup' | 'destination' | null>(null);
  const [isSearchingPickup, setIsSearchingPickup] = useState(false);
  const [isSearchingDest, setIsSearchingDest] = useState(false);
  const [isLocatingUser, setIsLocatingUser] = useState(false);
  const [gpsDetectedNotice, setGpsDetectedNotice] = useState<string | null>(null);

  // Rating modal state
  const [ratingVal, setRatingVal] = useState(5);
  const [ratingComment, setRatingComment] = useState('');
  const [ratingCompliments, setRatingCompliments] = useState<string[]>([]);

  const searchTimeoutRef = useRef<any>(null);

  // Calculate actual dynamic distance between points (default 1.2 km para as rotas centrais de Indaiatuba)
  const dynamicDistanceKm = pickup && destination
    ? Number(calculateDistanceKm(pickup.lat, pickup.lng, destination.lat, destination.lng).toFixed(1)) || 1.2
    : 1.2;

  // Keep inputs synced when pickup/destination change from map clicks
  useEffect(() => {
    if (pickup?.address && pickup.address !== pickupInput) {
      setPickupInput(pickup.address);
    }
  }, [pickup]);

  useEffect(() => {
    if (destination?.address && destination.address !== destInput) {
      setDestInput(destination.address);
    }
  }, [destination]);

  // Handle Automatic Search for Pickup
  const handlePickupChange = (value: string) => {
    setPickupInput(value);
    if (addressValidationError) setAddressValidationError(null);
    setActiveDropdown('pickup');

    if (searchTimeoutRef.current) clearTimeout(searchTimeoutRef.current);

    if (value.trim().length >= 2) {
      setIsSearchingPickup(true);
      searchTimeoutRef.current = setTimeout(async () => {
        const results = await searchAddressAutocomplete(value);
        setPickupSuggestions(results);
        setIsSearchingPickup(false);
      }, 250);
    } else {
      setPickupSuggestions(POPULAR_DATABASE_LOCATIONS.slice(0, 4));
      setIsSearchingPickup(false);
    }
  };

  // Handle Automatic Search for Destination
  const handleDestChange = (value: string) => {
    setDestInput(value);
    if (addressValidationError) setAddressValidationError(null);
    setActiveDropdown('destination');

    if (searchTimeoutRef.current) clearTimeout(searchTimeoutRef.current);

    if (value.trim().length >= 2) {
      setIsSearchingDest(true);
      searchTimeoutRef.current = setTimeout(async () => {
        const results = await searchAddressAutocomplete(value);
        setDestSuggestions(results);
        setIsSearchingDest(false);
      }, 250);
    } else {
      setDestSuggestions(POPULAR_DATABASE_LOCATIONS.slice(0, 4));
      setIsSearchingDest(false);
    }
  };

  // Select a suggestion
  const handleSelectSuggestion = (type: 'pickup' | 'destination', suggestion: AddressSuggestion) => {
    if (addressValidationError) setAddressValidationError(null);
    if (type === 'pickup') {
      setPickup({
        address: suggestion.label,
        lat: suggestion.lat,
        lng: suggestion.lng,
      });
      setPickupInput(suggestion.label);
    } else {
      setDestination({
        address: suggestion.label,
        lat: suggestion.lat,
        lng: suggestion.lng,
      });
      setDestInput(suggestion.label);
    }
    setActiveDropdown(null);
  };

  // Detect Current User Location with GPS and resolve real departure street address
  const handleUseCurrentLocation = () => {
    setIsLocatingUser(true);
    setGpsDetectedNotice(null);
    if (addressValidationError) setAddressValidationError(null);

    const onCoordsResolved = async (lat: number, lng: number) => {
      try {
        const geoResult = await reverseGeocodeCoords(lat, lng);
        setPickup({
          address: geoResult.fullAddress,
          lat,
          lng,
        });
        setPickupInput(geoResult.fullAddress);
        setGpsDetectedNotice(geoResult.fullAddress);
      } catch {
        const fallback = 'Av. Presidente Vargas, 1250 - Centro, Indaiatuba-SP';
        setPickup({ address: fallback, lat, lng });
        setPickupInput(fallback);
        setGpsDetectedNotice(fallback);
      } finally {
        setIsLocatingUser(false);
        setActiveDropdown(null);
      }
    };

    if (!navigator.geolocation) {
      onCoordsResolved(-23.0842, -47.2118);
      return;
    }

    navigator.geolocation.getCurrentPosition(
      (pos) => {
        onCoordsResolved(pos.coords.latitude, pos.coords.longitude);
      },
      () => {
        // Fallback default position: Av. Presidente Vargas, 1250, Centro de Indaiatuba - SP
        onCoordsResolved(-23.0842, -47.2118);
      },
      { enableHighAccuracy: true, timeout: 10000, maximumAge: 0 }
    );
  };

  const handleRequestRideWithCategory = (
    catId?: VehicleCategory,
    methodOverride?: 'pix' | 'credit_card' | 'money' | 'dinheiro' | 'race_pay'
  ) => {
    if (hasOpenDebt) {
      setPaymentBlockedError(
        `Você possui uma corrida em aberto de ${formatBRL(passengerDebt?.debtAmount || 0)}. Pague via PIX Asaas abaixo para liberar novas corridas.`
      );
      return;
    }
    // 3. Validação estrita: se endereço não tiver número, mostrar alerta e bloquear pedido
    if (!hasAddressNumber(pickupInput)) {
      setAddressValidationError('Coloque o número do endereço de saída (embarque) para o motorista te achar.');
      const el = document.getElementById('route-details');
      if (el) el.scrollIntoView({ behavior: 'smooth' });
      return;
    }

    if (!hasAddressNumber(destInput)) {
      setAddressValidationError('Coloque o número do endereço de chegada (destino) para o motorista te achar.');
      const el = document.getElementById('route-details');
      if (el) el.scrollIntoView({ behavior: 'smooth' });
      return;
    }

    setAddressValidationError(null);

    const finalCategory = catId || selectedCategory;
    setSelectedCategory(finalCategory);

    const effectiveMethod = methodOverride || paymentMethod;
    const isCash = isCashMethod(effectiveMethod);
    const isAsaasConfirmed =
      asaasConfirmedStatus === 'RECEIVED' || asaasConfirmedStatus === 'CONFIRMED';

    if (!isCash && (!isPaidInApp || !isAsaasConfirmed || !asaasPayment?.id)) {
      setPaymentBlockedError('Pague o PIX primeiro, estamos aguardando confirmação do Asaas');
      return;
    }

    const calculated = calculateFare(finalCategory, dynamicDistanceKm);

    const finalPickup: LocationPoint = pickup || {
      address: pickupInput || 'Av. Presidente Vargas, 1250 - Centro, Indaiatuba-SP',
      lat: -23.0842,
      lng: -47.2118,
    };

    const finalDest: LocationPoint = destination || {
      address: destInput || 'Av. dos Trabalhadores, 350 - Jardim América, Indaiatuba-SP',
      lat: -23.0805,
      lng: -47.2050,
    };

    // Dinheiro: cria imediatamente com status 'procurando' e forma_pagamento 'dinheiro' (SEM Asaas)
    // PIX / Cartão: criado apenas após confirmação real no Asaas (RECEIVED ou CONFIRMED)
    const newRide: Ride = {
      id: '',
      passengerId: currentUser?.id,
      passengerEmail: currentUser?.email,
      passengerName: currentUser?.name || 'Passageiro RACE',
      passengerPhone: currentUser?.whatsapp || currentUser?.phone || '',
      passengerAvatar: currentUser?.avatar || '',
      passengerRating: currentUser?.rating || 0,
      driver: undefined,
      category: finalCategory,
      pickup: finalPickup,
      destination: finalDest,
      distanceKm: dynamicDistanceKm,
      durationMinutes: Math.round(dynamicDistanceKm * 2.2),
      price: calculated.totalPrice,
      driverEarnings: calculated.driverEarnings, // 85% repassado ao condutor
      platformFee: calculated.platformFee,       // 15% comissão Race
      paymentMethod: isCash ? 'dinheiro' : effectiveMethod,
      paymentStatus: isCash ? 'pending' : 'paid',
      asaasPaymentId: isCash ? undefined : asaasPayment?.id,
      asaasStatus: isCash ? undefined : asaasConfirmedStatus,
      status: 'procurando',
      confirmationCode: generateUniqueRideConfirmationCode(),
      createdAt: new Date().toISOString(),
    };

    onStartRide(newRide);
  };

  const getCategoryDisplayName = (cat: VehicleCategory) => {
    switch (cat) {
      case 'confort':
        return 'Motorista Confort';
      case 'moto_passageiro':
        return 'Motoboy Passageiro';
      case 'moto_entrega':
        return 'Motoboy Entregas';
      case 'economica':
      default:
        return 'Motorista Econômico';
    }
  };

  const handleSearchRides = () => {
    if (hasOpenDebt) {
      setAddressValidationError(
        `Novas corridas bloqueadas até o pagamento da dívida de ${formatBRL(passengerDebt?.debtAmount || 0)} via PIX Asaas.`
      );
      return;
    }
    if (!hasAddressNumber(pickupInput)) {
      setAddressValidationError('Coloque o número do endereço de saída (embarque) para o motorista te achar.');
      const el = document.getElementById('route-details');
      if (el) el.scrollIntoView({ behavior: 'smooth' });
      return;
    }

    if (!hasAddressNumber(destInput)) {
      setAddressValidationError('Coloque o número do endereço de chegada (destino) para o motorista te achar.');
      const el = document.getElementById('route-details');
      if (el) el.scrollIntoView({ behavior: 'smooth' });
      return;
    }

    setAddressValidationError(null);
    setPassengerStep('options');
  };

  const initAsaasPayment = async (
    method: 'pix' | 'credit_card' | 'money' | 'dinheiro' | 'race_pay',
    cat: VehicleCategory = selectedCategory
  ) => {
    setIsPaidInApp(false);
    setAsaasConfirmedStatus('PENDING');
    setPaymentBlockedError(null);
    setAsaasPayment(null);
    if (isCashMethod(method)) {
      setIsLoadingAsaas(false);
      return;
    }
    setIsLoadingAsaas(true);
    const fare = calculateFare(cat, dynamicDistanceKm);
    try {
      if (method === 'pix') {
        const res = await createAsaasPixPayment({
          value: fare.totalPrice,
          categoryName: getCategoryDisplayName(cat),
          passengerName: currentUser?.name,
          passengerEmail: currentUser?.email,
          passengerPhone: currentUser?.phone || currentUser?.whatsapp,
        });
        setAsaasPayment(res);
      } else {
        const res = await createAsaasCardPayment({
          value: fare.totalPrice,
          categoryName: getCategoryDisplayName(cat),
          passengerName: currentUser?.name,
          passengerEmail: currentUser?.email,
          passengerPhone: currentUser?.phone || currentUser?.whatsapp,
        });
        setAsaasPayment(res);
      }
    } catch (err) {
      console.error('[Asaas] Falha ao gerar cobrança:', err);
    } finally {
      setIsLoadingAsaas(false);
    }
  };

  // Monitora e pesquisa aprovação REAL no Asaas a cada 3 segundos (RECEIVED ou CONFIRMED)
  useEffect(() => {
    if (
      passengerStep !== 'payment' ||
      isCashMethod(paymentMethod) ||
      !asaasPayment?.id ||
      isPaidInApp
    ) {
      if (pollingTimerRef.current) clearInterval(pollingTimerRef.current);
      setIsPollingAsaas(false);
      return;
    }

    setIsPollingAsaas(true);
    pollingTimerRef.current = setInterval(async () => {
      try {
        const check = await checkAsaasPaymentStatus(asaasPayment.id);
        if (check.isPaid && (check.status === 'RECEIVED' || check.status === 'CONFIRMED')) {
          clearInterval(pollingTimerRef.current);
          setIsPollingAsaas(false);
          setAsaasConfirmedStatus(check.status);
          setIsPaidInApp(true);
          setPaymentBlockedError(null);
          try {
            confetti({ particleCount: 60, spread: 70, origin: { y: 0.6 } });
          } catch {}
        }
      } catch {}
    }, 3000);

    return () => {
      if (pollingTimerRef.current) clearInterval(pollingTimerRef.current);
    };
  }, [passengerStep, paymentMethod, asaasPayment?.id, isPaidInApp]);

  // Gera PIX Asaas automático e monitora a cada 3 segundos quando passageiro tiver dívida em aberto
  useEffect(() => {
    if (!hasOpenDebt) {
      if (debtPollingRef.current) clearInterval(debtPollingRef.current);
      setAsaasDebtPayment(null);
      setIsDebtPaid(false);
      setAsaasDebtStatus('PENDING');
      return;
    }

    let cancelled = false;
    if (!asaasDebtPayment && !isLoadingDebtAsaas && (passengerDebt?.debtAmount || 0) > 0) {
      setIsLoadingDebtAsaas(true);
      createAsaasPixPayment({
        value: passengerDebt!.debtAmount,
        categoryName: 'Quitação de Corrida em Dinheiro (RACE)',
        passengerName: currentUser?.name,
        passengerEmail: currentUser?.email,
        passengerPhone: currentUser?.phone || currentUser?.whatsapp,
      })
        .then((res) => {
          if (!cancelled) setAsaasDebtPayment(res);
        })
        .catch(() => {})
        .finally(() => {
          if (!cancelled) setIsLoadingDebtAsaas(false);
        });
    }

    return () => {
      cancelled = true;
    };
  }, [hasOpenDebt, passengerDebt?.debtAmount, asaasDebtPayment, isLoadingDebtAsaas, currentUser?.email]);

  useEffect(() => {
    if (!hasOpenDebt || !asaasDebtPayment?.id || isDebtPaid) {
      if (debtPollingRef.current) clearInterval(debtPollingRef.current);
      return;
    }

    debtPollingRef.current = setInterval(async () => {
      try {
        const check = await checkAsaasPaymentStatus(asaasDebtPayment.id);
        if (check.isPaid && (check.status === 'RECEIVED' || check.status === 'CONFIRMED')) {
          clearInterval(debtPollingRef.current);
          setAsaasDebtStatus(check.status);
          setIsDebtPaid(true);
          try {
            confetti({ particleCount: 60, spread: 70, origin: { y: 0.6 } });
          } catch {}
        }
      } catch {}
    }, 3000);

    return () => {
      if (debtPollingRef.current) clearInterval(debtPollingRef.current);
    };
  }, [hasOpenDebt, asaasDebtPayment?.id, isDebtPaid]);

  const handleSelectCategory = (cat: VehicleCategory) => {
    setSelectedCategory(cat);
    setIsPaidInApp(false);
    setAsaasConfirmedStatus('PENDING');
    setPaymentBlockedError(null);
    setPassengerStep('payment');
    initAsaasPayment(paymentMethod, cat);
  };

  // Fluxo DINHEIRO: cria corrida NA HORA no Supabase sem passar pelo Asaas
  const handleConfirmMoneyRide = () => {
    if (!hasAddressNumber(pickupInput)) {
      setAddressValidationError('Coloque o número do endereço de saída (embarque) para o motorista te achar.');
      const el = document.getElementById('route-details');
      if (el) el.scrollIntoView({ behavior: 'smooth' });
      return;
    }
    if (!hasAddressNumber(destInput)) {
      setAddressValidationError('Coloque o número do endereço de chegada (destino) para o motorista te achar.');
      const el = document.getElementById('route-details');
      if (el) el.scrollIntoView({ behavior: 'smooth' });
      return;
    }

    if (pollingTimerRef.current) clearInterval(pollingTimerRef.current);
    setIsProcessingPayment(false);
    setIsPaidInApp(false);
    setPaymentBlockedError(null);
    handleRequestRideWithCategory(selectedCategory, 'dinheiro');
    setPassengerStep('search');
    if (onOpenFullMap) {
      onOpenFullMap();
    }
  };

  // Pagamento real com Cartão na API Asaas (só libera se retornar RECEIVED ou CONFIRMED)
  const handlePayCardWithAsaas = async () => {
    if (!asaasPayment?.id) {
      setPaymentBlockedError('Pague o PIX primeiro, estamos aguardando confirmação do Asaas');
      return;
    }
    const cleanNum = cardNumber.replace(/\D/g, '');
    const cleanExpiry = cardExpiry.replace(/\D/g, '');
    const cleanCpf = cardHolderCpf.replace(/\D/g, '');
    const cleanCep = cardHolderCep.replace(/\D/g, '');

    if (
      cleanNum.length < 13 ||
      !cardHolder.trim() ||
      cleanExpiry.length < 4 ||
      cardCvv.trim().length < 3 ||
      cleanCpf.length < 11 ||
      cleanCep.length < 8
    ) {
      setPaymentBlockedError(
        'Preencha todos os dados do cartão, CPF e CEP para cobrar no Asaas ou pague pelo Link de Pagamento Asaas acima.'
      );
      return;
    }

    const expiryMonth = cleanExpiry.slice(0, 2);
    const rawYear = cleanExpiry.slice(2);
    const expiryYear = rawYear.length === 2 ? `20${rawYear}` : rawYear;

    setIsProcessingPayment(true);
    setPaymentBlockedError(null);
    try {
      const result = await payAsaasPaymentWithCreditCard({
        paymentId: asaasPayment.id,
        cardHolder: cardHolder.trim().toUpperCase(),
        cardNumber: cleanNum,
        expiryMonth,
        expiryYear,
        ccv: cardCvv.trim(),
        holderName: cardHolder.trim() || currentUser?.name || 'Passageiro RACE',
        holderEmail: currentUser?.email || 'passageiro@race.com.br',
        holderCpfCnpj: cleanCpf,
        holderPostalCode: cleanCep,
        holderAddressNumber: extractAddressNumber(pickupInput) || '100',
        holderPhone: currentUser?.whatsapp || currentUser?.phone || '19999999999',
      });

      if (result.isPaid && (result.status === 'RECEIVED' || result.status === 'CONFIRMED')) {
        setAsaasConfirmedStatus(result.status);
        setIsPaidInApp(true);
        setPaymentBlockedError(null);
        try {
          confetti({ particleCount: 60, spread: 70, origin: { y: 0.6 } });
        } catch {}
      } else {
        setPaymentBlockedError(
          result.errorMessage || 'Pague o PIX primeiro, estamos aguardando confirmação do Asaas'
        );
      }
    } finally {
      setIsProcessingPayment(false);
    }
  };

  // Só executa após pagamento confirmado de verdade pelo Asaas (RECEIVED ou CONFIRMED)
  const handleConfirmRideAfterPayment = () => {
    const isAsaasConfirmed =
      asaasConfirmedStatus === 'RECEIVED' || asaasConfirmedStatus === 'CONFIRMED';
    if (!isCashMethod(paymentMethod) && (!isPaidInApp || !isAsaasConfirmed)) {
      setPaymentBlockedError('Pague o PIX primeiro, estamos aguardando confirmação do Asaas');
      return;
    }
    setPaymentBlockedError(null);
    handleRequestRideWithCategory(selectedCategory);
    setPassengerStep('search');
    if (onOpenFullMap) {
      onOpenFullMap();
    }
  };

  const handleToggleCompliment = (item: string) => {
    setRatingCompliments((prev) =>
      prev.includes(item) ? prev.filter((i) => i !== item) : [...prev, item]
    );
  };

  const handleFinishRating = () => {
    const commentFull = [
      ...ratingCompliments,
      ratingComment.trim(),
    ]
      .filter(Boolean)
      .join(' • ');

    onSubmitRating(ratingVal, commentFull || 'Excelente viagem com a RACE!');
  };

  // Audio state
  const [audioEnabled, setAudioEnabledState] = useState(() => isAudioEnabled());

  useEffect(() => {
    const handleAudioSync = (e: any) => {
      if (e?.detail?.enabled !== undefined) {
        setAudioEnabledState(e.detail.enabled);
      } else {
        setAudioEnabledState(isAudioEnabled());
      }
    };
    window.addEventListener('race_audio_toggle', handleAudioSync);
    return () => window.removeEventListener('race_audio_toggle', handleAudioSync);
  }, []);

  const handleToggleAudio = () => {
    const next = toggleAudio();
    setAudioEnabledState(next);
  };

  // Fluxo direto: ao confirmar o pagamento, abre direto o FullMapView fullscreen
  // Sem tela cheia intermediária do motorista na aba do passageiro

  // Normal request mode in Clean White
  return (
    <div className="w-full max-w-full min-w-0 overflow-x-hidden box-border space-y-5">
      {/* 1. Login / Cadastro Success Direct Entry Notification */}
      {loginSuccessBanner && (
        <div className="bg-emerald-50 border-2 border-emerald-400 rounded-3xl p-4 sm:p-5 flex flex-col sm:flex-row sm:items-center justify-between gap-3 shadow-sm animate-fade-in min-w-0">
          <div className="flex items-start sm:items-center gap-3 min-w-0 flex-1">
            <div className="w-10 h-10 sm:w-11 sm:h-11 rounded-2xl bg-emerald-500 text-slate-950 flex items-center justify-center font-black shrink-0 shadow-xs">
              <CheckCircle2 className="w-5 h-5 sm:w-6 sm:h-6" />
            </div>
            <div className="min-w-0 flex-1">
              <div className="flex items-center gap-2 flex-wrap">
                <span className="font-heading font-black text-slate-950 text-sm sm:text-base">
                  Acesso Concluído com Sucesso
                </span>
                <span className="text-[11px] font-mono font-black bg-emerald-200 text-emerald-950 px-2 py-0.5 rounded-full">
                  DIRETO NO ATENDIMENTO
                </span>
              </div>
              <p className="text-xs sm:text-sm text-emerald-900 font-medium mt-0.5">
                {loginSuccessBanner}
              </p>
            </div>
          </div>
          {onClearLoginBanner && (
            <button
              type="button"
              onClick={onClearLoginBanner}
              className="text-emerald-700 hover:text-emerald-950 p-1 rounded-lg hover:bg-emerald-100 cursor-pointer"
              title="Fechar aviso"
            >
              <X className="w-4 h-4" />
            </button>
          )}
        </div>
      )}


      {/* 2. Mini Card de Corrida Ativa: MODO PROCURANDO vs MODO A CAMINHO */}
      {activeRide && (() => {
        const isRideDone =
          activeRide.status === 'completed' || (activeRide.status as string) === 'finalizada';
        const isRideAccepted =
          activeRide.status === 'accepted' ||
          (activeRide.status as string) === 'aceita' ||
          activeRide.status === 'driver_assigned' ||
          activeRide.status === 'driver_arriving' ||
          activeRide.status === 'in_progress' ||
          isRideDone;

        if (!isRideAccepted) {
          return (
            <div className="bg-zinc-950 border-2 border-[#ff6a00] text-white rounded-3xl p-4 sm:p-5 shadow-2xl space-y-4 animate-fade-in">
              <div className="flex flex-col sm:flex-row items-center justify-between gap-4">
                <div className="flex items-center gap-3.5 w-full sm:w-auto">
                  <div className="w-12 h-12 rounded-full bg-[#ff6a00]/20 text-[#ff6a00] border-2 border-[#ff6a00] shrink-0 flex items-center justify-center">
                    <Loader2 className="w-6 h-6 animate-spin" />
                  </div>
                  <div className="min-w-0 flex-1">
                    <div className="flex items-center gap-2">
                      <span className="w-2.5 h-2.5 rounded-full bg-amber-400 animate-ping" />
                      <span className="text-xs font-mono text-[#ff6a00] font-black uppercase">
                        Procurando motorista...
                      </span>
                    </div>
                    <h4 className="font-heading font-black text-base text-white truncate">
                      Aguardando motorista aceitar sua corrida
                    </h4>
                    <p className="text-xs text-zinc-400 truncate">
                      {activeRide.pickup?.address} → {activeRide.destination?.address}
                    </p>
                  </div>
                </div>

                <div className="flex items-center gap-2 w-full sm:w-auto">
                  {onOpenFullMap && (
                    <button
                      type="button"
                      onClick={onOpenFullMap}
                      className="flex-1 sm:flex-none px-4 py-3 bg-[#ff6a00] hover:bg-[#e05e00] text-white font-heading font-black text-xs sm:text-sm rounded-2xl transition-all cursor-pointer shadow-lg flex items-center justify-center gap-2 active:scale-95 border border-[#ff8533]"
                    >
                      <Maximize2 className="w-4 h-4 shrink-0" />
                      <span>VER O MAPA TELA INTEIRA</span>
                    </button>
                  )}
                  <button
                    type="button"
                    onClick={onCancelRide}
                    className="px-4 py-3 bg-rose-600 hover:bg-rose-500 text-white font-heading font-black text-xs sm:text-sm rounded-2xl border border-rose-500 cursor-pointer active:scale-95"
                  >
                    Cancelar busca
                  </button>
                </div>
              </div>
            </div>
          );
        }

        return (
          <div className="bg-zinc-950 border-2 border-[#ff6a00] text-white rounded-3xl p-4 sm:p-5 shadow-2xl space-y-4 animate-fade-in">
            {/* CAIXA AMARELA GRANDE NO TOPO DO CARD DO PASSAGEIRO (SÓ DEPOIS QUE ACEITAR) */}
            {activeRide.confirmationCode && (
              <div className="bg-amber-300 border-4 border-amber-500 rounded-2xl p-4 text-center shadow-lg text-slate-950">
                <div className="flex items-center justify-center gap-2 text-xs sm:text-sm font-heading font-black uppercase tracking-wider">
                  <ShieldCheck className="w-5 h-5 text-slate-950 shrink-0" />
                  <span>SEU CÓDIGO DE EMBARQUE</span>
                </div>
                <div
                  style={{ fontSize: '48px', lineHeight: 1.05 }}
                  className="font-mono font-black text-slate-950 tracking-[0.2em] my-1.5 select-text"
                >
                  {activeRide.confirmationCode}
                </div>
                <p className="text-xs sm:text-sm font-extrabold text-slate-900">
                  Mostre esse código para o motorista
                </p>
                <button
                  type="button"
                  onClick={() => {
                    navigator.clipboard?.writeText(activeRide.confirmationCode || '');
                    setRideCodeCopied(true);
                    setTimeout(() => setRideCodeCopied(false), 2500);
                  }}
                  className="mt-2.5 inline-flex items-center justify-center gap-2 px-5 py-2 bg-slate-950 hover:bg-slate-800 active:scale-95 text-white font-heading font-black text-xs sm:text-sm rounded-xl cursor-pointer shadow-md"
                >
                  {rideCodeCopied ? (
                    <>
                      <Check className="w-4 h-4 text-emerald-400" />
                      <span>CÓDIGO COPIADO!</span>
                    </>
                  ) : (
                    <>
                      <Copy className="w-4 h-4" />
                      <span>COPIAR CÓDIGO</span>
                    </>
                  )}
                </button>
              </div>
            )}

            <div className="flex flex-col sm:flex-row items-center justify-between gap-4">
              <div className="flex items-center gap-3.5 w-full sm:w-auto">
                {activeRide.driver?.avatar ? (
                  <img
                    src={activeRide.driver.avatar}
                    alt={activeRide.driver.name}
                    className="w-12 h-12 rounded-full object-cover border-2 border-[#ff6a00] shrink-0"
                  />
                ) : (
                  <div className="w-12 h-12 rounded-full bg-[#ff6a00]/20 text-[#ff6a00] border-2 border-[#ff6a00] shrink-0 flex items-center justify-center font-heading font-black text-lg">
                    {(activeRide.driver?.name || 'M').charAt(0).toUpperCase()}
                  </div>
                )}
                <div className="min-w-0 flex-1">
                  <div className="flex items-center gap-2">
                    <span className="w-2.5 h-2.5 rounded-full bg-emerald-500 animate-ping" />
                    <span className="text-[11px] font-mono text-[#ff6a00] font-black uppercase">
                      {isRideDone ? 'Viagem Finalizada' : 'Motorista a caminho!'}
                    </span>
                  </div>
                  <h4 className="font-heading font-black text-base text-white truncate">
                    {activeRide.driver?.name} {activeRide.driver?.vehicleModel ? `• ${activeRide.driver.vehicleModel}` : ''}
                  </h4>
                  <p className="text-xs text-zinc-300 font-mono">
                    {activeRide.driver?.vehiclePlate ? `Placa ${activeRide.driver.vehiclePlate}` : 'Condutor confirmado'}
                    {activeRide.driver?.vehicleColor ? ` • ${activeRide.driver.vehicleColor}` : ''}
                    {activeRide.driver?.vehicleYear ? ` • ${activeRide.driver.vehicleYear}` : ''}
                  </p>
                </div>
              </div>

              <div className="flex items-center gap-2 w-full sm:w-auto flex-wrap">
                {onOpenFullMap && (
                  <button
                    type="button"
                    onClick={onOpenFullMap}
                    className="flex-1 sm:flex-none px-4 py-3 bg-[#ff6a00] hover:bg-[#e05e00] text-white font-heading font-black text-xs sm:text-sm rounded-2xl transition-all cursor-pointer shadow-lg flex items-center justify-center gap-2 active:scale-95 border border-[#ff8533]"
                  >
                    <Maximize2 className="w-4 h-4 shrink-0" />
                    <span>VER O MAPA TELA INTEIRA</span>
                  </button>
                )}

                {activeRide.driver?.phone && !isRideDone && (
                  <a
                    href={`tel:${activeRide.driver.phone.replace(/\D/g, '')}`}
                    className="px-3.5 py-3 bg-emerald-600 hover:bg-emerald-500 text-white font-heading font-black text-xs rounded-2xl border border-emerald-500 flex items-center gap-1.5"
                  >
                    <Phone className="w-3.5 h-3.5" />
                    <span>Ligar para o motorista</span>
                  </a>
                )}

                {!isRideDone ? (
                  <button
                    type="button"
                    onClick={onCancelRide}
                    className="px-3.5 py-3 bg-zinc-800 hover:bg-zinc-700 text-rose-400 font-bold text-xs rounded-2xl border border-zinc-700 cursor-pointer active:scale-95"
                  >
                    Cancelar
                  </button>
                ) : (
                  <button
                    type="button"
                    onClick={onCompleteRide}
                    className="px-3.5 py-3 bg-emerald-600 hover:bg-emerald-500 text-white font-bold text-xs rounded-2xl cursor-pointer active:scale-95"
                  >
                    Avaliar
                  </button>
                )}
              </div>
            </div>
          </div>
        );
      })()}

      {/* BLOQUEIO POR NÃO PAGAMENTO EM DINHEIRO: Só libera novas corridas após quitar via PIX Asaas */}
      {hasOpenDebt && !activeRide && (() => {
        const debtValue = passengerDebt?.debtAmount || 0;
        const debtPixPayload = (
          asaasDebtPayment?.pixQrCode?.payload ||
          (asaasDebtPayment?.pixQrCode as any)?.pixCopyPaste ||
          generateFallbackPixCopiaECola(debtValue, `DIVIDA${Math.round(debtValue * 100)}`)
        ).trim();

        return (
          <div className="bg-white border-2 border-rose-500 rounded-3xl p-4 sm:p-6 shadow-xl space-y-4 animate-fade-in min-w-0 w-full box-border">
            <div className="bg-rose-50 border-2 border-rose-300 rounded-2xl p-4 flex items-start gap-3 min-w-0">
              <AlertTriangle className="w-6 h-6 text-rose-600 shrink-0 mt-0.5" />
              <div className="min-w-0 flex-1">
                <h3 className="font-heading font-black text-rose-950 text-base sm:text-lg">
                  Conta bloqueada para novas corridas
                </h3>
                <p className="text-xs sm:text-sm text-rose-900 font-bold mt-1">
                  Foi registrado o não pagamento em dinheiro da sua última corrida no valor de{' '}
                  <span className="font-black text-rose-700">{formatBRL(debtValue)}</span>. Pague este PIX via Asaas para desbloquear suas corridas imediatamente.
                </p>
              </div>
            </div>

            {isLoadingDebtAsaas ? (
              <div className="py-10 flex flex-col items-center justify-center gap-3">
                <Loader2 className="w-9 h-9 animate-spin text-[#ff6a00]" />
                <p className="text-xs sm:text-sm font-bold text-slate-700">
                  Gerando PIX Asaas no valor de {formatBRL(debtValue)}...
                </p>
              </div>
            ) : (
              <div className="bg-slate-50 border border-slate-200 rounded-3xl p-4 sm:p-5 text-center space-y-4 min-w-0 overflow-hidden">
                <div className="flex flex-wrap items-center justify-between gap-2 border-b border-slate-200 pb-3">
                  <span className="font-heading font-black text-slate-900 text-sm">
                    Quitação de Corrida Pendente (PIX Asaas)
                  </span>
                  <span className="text-xs font-mono font-black text-rose-700 bg-rose-100 px-3 py-1 rounded-full border border-rose-300">
                    {formatBRL(debtValue)}
                  </span>
                </div>

                {asaasDebtPayment?.pixQrCode?.encodedImage ? (
                  <img
                    src={asaasDebtPayment.pixQrCode.encodedImage}
                    alt="QR Code Quitação PIX Asaas"
                    className="w-48 h-48 sm:w-52 sm:h-52 mx-auto rounded-2xl border-2 border-emerald-500 shadow-md p-2 bg-white object-contain"
                  />
                ) : (
                  <div className="w-48 h-48 sm:w-52 sm:h-52 mx-auto bg-white p-3 border-2 border-emerald-500 rounded-2xl flex items-center justify-center">
                    <QrCode className="w-32 h-32 text-slate-900" />
                  </div>
                )}

                <div className="space-y-2 text-left bg-white p-3.5 sm:p-4 rounded-2xl border-2 border-emerald-500 min-w-0 overflow-hidden">
                  <div className="w-full max-w-full min-w-0 bg-slate-50 border border-slate-300 rounded-xl p-2.5 overflow-x-auto whitespace-nowrap">
                    <code className="text-xs font-mono font-bold text-slate-900 select-all">
                      {debtPixPayload}
                    </code>
                  </div>
                  <button
                    type="button"
                    onClick={async () => {
                      if (!debtPixPayload) return;
                      try {
                        await navigator?.clipboard?.writeText(debtPixPayload);
                        setDebtPixCopied(true);
                        setTimeout(() => setDebtPixCopied(false), 3500);
                      } catch {}
                    }}
                    className="w-full py-3 px-4 bg-emerald-600 hover:bg-emerald-700 text-white font-heading font-black text-xs sm:text-sm rounded-xl flex items-center justify-center gap-2 cursor-pointer"
                  >
                    <Copy className="w-4 h-4" />
                    <span>{debtPixCopied ? 'Código PIX copiado!' : 'Copiar Código PIX Completo'}</span>
                  </button>
                </div>

                {!(isDebtPaid && (asaasDebtStatus === 'RECEIVED' || asaasDebtStatus === 'CONFIRMED')) && (
                  <div className="p-3 bg-emerald-50 border border-emerald-200 rounded-2xl flex items-center justify-center gap-2 text-xs font-bold text-emerald-900">
                    <Loader2 className="w-4 h-4 text-emerald-600 shrink-0 animate-spin" />
                    <span>Aguardando confirmação do Asaas em tempo real...</span>
                  </div>
                )}

                <button
                  type="button"
                  disabled={
                    !(isDebtPaid && (asaasDebtStatus === 'RECEIVED' || asaasDebtStatus === 'CONFIRMED')) ||
                    isClearingDebt
                  }
                  onClick={async () => {
                    if (!asaasDebtPayment?.id || !isDebtPaid || !onClearPassengerDebt) return;
                    setIsClearingDebt(true);
                    try {
                      await onClearPassengerDebt(asaasDebtPayment.id, asaasDebtStatus as 'RECEIVED' | 'CONFIRMED');
                    } finally {
                      setIsClearingDebt(false);
                    }
                  }}
                  className={`w-full font-heading font-black text-sm sm:text-base py-4 px-6 rounded-2xl shadow-md flex items-center justify-center gap-2.5 border-2 transition-all uppercase tracking-wider ${
                    isDebtPaid && (asaasDebtStatus === 'RECEIVED' || asaasDebtStatus === 'CONFIRMED')
                      ? 'bg-emerald-600 hover:bg-emerald-500 text-white border-emerald-400 cursor-pointer shadow-xl'
                      : 'bg-slate-300 text-slate-600 border-slate-400 cursor-not-allowed opacity-85'
                  }`}
                >
                  {isDebtPaid && (asaasDebtStatus === 'RECEIVED' || asaasDebtStatus === 'CONFIRMED') ? (
                    <>
                      <CheckCircle2 className="w-5 h-5 text-white" />
                      <span>{isClearingDebt ? 'Liberando conta...' : 'Pagamento confirmado! Liberar minhas corridas'}</span>
                    </>
                  ) : (
                    <>
                      <Lock className="w-5 h-5 text-slate-500 shrink-0" />
                      <span>Aguardando pagamento...</span>
                    </>
                  )}
                </button>
              </div>
            )}
          </div>
        );
      })()}

      {/* ETAPA 1: BUSCA DE CORRIDA (Origem com Meu GPS e Destino com Número) */}
      {!hasOpenDebt && passengerStep === 'search' && (
        <div id="route-details" className="w-full max-w-full min-w-0 box-border bg-white border border-slate-200 rounded-3xl p-4 sm:p-6 shadow-md space-y-4 animate-fade-in">
        {/* Banner de Erro de Validação de Número */}
        {addressValidationError && (
          <div className="bg-rose-50 border-2 border-rose-400 p-3.5 sm:p-4 rounded-2xl flex items-center justify-between gap-2 text-rose-950 font-bold text-xs sm:text-sm shadow-md animate-bounce min-w-0">
            <div className="flex items-center gap-2 min-w-0 flex-1">
              <AlertTriangle className="w-5 h-5 text-rose-600 shrink-0" />
              <span className="break-words">{addressValidationError}</span>
            </div>
            <button
              type="button"
              onClick={() => setAddressValidationError(null)}
              className="text-rose-700 hover:text-rose-950 p-1 cursor-pointer font-bold text-sm shrink-0"
            >
              ✕
            </button>
          </div>
        )}

        <div className="flex flex-col items-start gap-2.5 pb-3 border-b border-slate-200 w-full min-w-0">
          <h2 className="w-full font-heading font-black text-slate-950 text-[clamp(21px,6.2vw,28px)] leading-tight tracking-tight whitespace-nowrap flex items-center gap-2">
            <Navigation className="w-5 h-5 sm:w-6 sm:h-6 text-amber-600 shrink-0" />
            <span>Para onde vamos hoje?</span>
          </h2>
          <p className="w-full text-xs sm:text-sm text-slate-600 font-medium leading-snug">
            Informe o ponto de embarque e destino com o número exato para o trajeto em Indaiatuba
          </p>
          <div className="w-full">
            <span className="inline-flex items-center text-xs font-mono text-emerald-700 bg-emerald-50 px-3 py-1 rounded-full border border-emerald-200 font-extrabold">
              {availableDrivers.filter((d) => d.status === 'online').length} condutores online
            </span>
          </div>
        </div>

        {/* Pickup Input com Busca Automática & Geolocalização */}
        <div className="relative w-full min-w-0">
          {/* Título em 1 linha + Botão 'Meu GPS' embaixo do título */}
          <div className="flex flex-col items-start gap-2 mb-2.5 w-full min-w-0">
            <label className="w-full flex items-center gap-1.5 text-[11px] min-[390px]:text-xs sm:text-sm font-heading font-black text-slate-900 uppercase tracking-tight whitespace-nowrap">
              <MapPin className="w-4 h-4 text-emerald-600 shrink-0" />
              <span>Endereço de Saída / Embarque (Com Número)</span>
            </label>
            <button
              type="button"
              onClick={handleUseCurrentLocation}
              title="Detectar Minha Localização GPS Atual"
              disabled={isLocatingUser}
              className="px-3.5 py-2 bg-emerald-600 hover:bg-emerald-700 active:scale-95 text-white text-xs sm:text-sm font-black rounded-xl cursor-pointer shadow-xs inline-flex items-center gap-1.5 transition-all disabled:opacity-60"
            >
              {isLocatingUser ? (
                <>
                  <Loader2 className="w-4 h-4 animate-spin text-white shrink-0" />
                  <span>Buscando seu GPS...</span>
                </>
              ) : (
                <>
                  <Crosshair className="w-4 h-4 text-emerald-100 shrink-0" />
                  <span>Meu GPS</span>
                </>
              )}
            </button>
          </div>

          <div className="relative w-full min-w-0">
            <input
              type="text"
              value={pickupInput}
              onChange={(e) => handlePickupChange(e.target.value)}
              onFocus={() => {
                setActiveDropdown('pickup');
                if (!pickupSuggestions.length) setPickupSuggestions(POPULAR_DATABASE_LOCATIONS.slice(0, 4));
              }}
              placeholder="Ex: Av. Presidente Vargas, 1250"
              className={`w-full min-w-0 box-border bg-white border-2 ${
                !hasAddressNumber(pickupInput) && pickupInput.trim().length > 3
                  ? 'border-amber-400 focus:border-amber-500'
                  : 'border-slate-300 hover:border-emerald-400 focus:border-emerald-600'
              } rounded-2xl p-4 ${pickupInput || isSearchingPickup ? 'pr-10' : ''} text-[14px] sm:text-base leading-snug text-slate-950 placeholder-slate-400 focus:outline-none focus:ring-4 focus:ring-emerald-500/10 font-bold shadow-xs transition-all overflow-hidden text-ellipsis`}
            />
            {isSearchingPickup && (
              <Loader2 className="w-5 h-5 text-emerald-600 animate-spin absolute right-3.5 top-1/2 -translate-y-1/2" />
            )}
            {pickupInput && !isSearchingPickup && (
              <button
                type="button"
                onClick={() => {
                  setPickupInput('');
                  setPickup(null);
                  setGpsDetectedNotice(null);
                }}
                className="absolute right-3.5 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-800 cursor-pointer p-0.5"
                title="Limpar endereço de saída"
              >
                <X className="w-5 h-5" />
              </button>
            )}
          </div>

          {/* 3. Alerta de Validação: Se endereço não tiver número */}
          {!hasAddressNumber(pickupInput) && pickupInput.trim().length > 3 && (
            <div className="mt-2.5 p-3.5 bg-amber-50 border-2 border-amber-400 rounded-2xl flex flex-col sm:flex-row sm:items-center justify-between gap-2.5 text-xs sm:text-sm text-amber-950 font-bold animate-fade-in shadow-xs">
              <div className="flex items-center gap-2">
                <AlertTriangle className="w-5 h-5 text-amber-600 shrink-0" />
                <span>Coloque o número do endereço para o motorista te achar</span>
              </div>
              <div className="flex items-center gap-1.5 self-end sm:self-center">
                <input
                  id="pickup-number-input"
                  type="text"
                  placeholder="Nº"
                  defaultValue="1250"
                  className="w-20 px-2.5 py-1.5 bg-white border-2 border-amber-400 rounded-xl text-xs font-black text-slate-900 focus:outline-none text-center"
                />
                <button
                  type="button"
                  onClick={() => {
                    const inputEl = document.getElementById('pickup-number-input') as HTMLInputElement;
                    const num = inputEl?.value?.trim() || '1250';
                    const updated = `${pickupInput}, ${num} - Indaiatuba-SP`;
                    setPickupInput(updated);
                    setPickup({
                      address: updated,
                      lat: pickup?.lat ?? -23.0842,
                      lng: pickup?.lng ?? -47.2118,
                    });
                    if (addressValidationError) setAddressValidationError(null);
                  }}
                  className="px-3 py-1.5 bg-amber-500 hover:bg-amber-600 active:scale-95 text-slate-950 rounded-xl font-black text-xs cursor-pointer shadow-xs transition-all uppercase"
                >
                  Inserir Nº
                </button>
              </div>
            </div>
          )}

          {/* Endereço de Saída detectado pelo Meu GPS */}
          {gpsDetectedNotice && (
            <div className="mt-2.5 flex items-center justify-between gap-2 bg-emerald-50 border-2 border-emerald-300 px-3.5 py-3 rounded-2xl text-xs sm:text-sm text-emerald-950 font-bold animate-fade-in shadow-xs min-w-0">
              <div className="flex items-center gap-2 min-w-0 flex-1">
                <span className="w-2.5 h-2.5 rounded-full bg-emerald-500 radar-pulse shrink-0" />
                <span className="text-emerald-800 font-black uppercase font-mono shrink-0">GPS:</span>
                <span className="text-slate-900 truncate font-extrabold">{gpsDetectedNotice}</span>
              </div>
              <button
                type="button"
                onClick={() => setGpsDetectedNotice(null)}
                className="text-emerald-700 hover:text-emerald-950 font-bold text-xs ml-1 cursor-pointer p-0.5 shrink-0"
                title="Fechar"
              >
                ✕
              </button>
            </div>
          )}

          {/* Dropdown de Busca Automática para Embarque */}
          {activeDropdown === 'pickup' && (
            <div className="absolute left-0 right-0 top-full z-50 bg-white border-2 border-emerald-400 rounded-2xl shadow-2xl mt-1 overflow-hidden divide-y divide-slate-100 max-h-64 overflow-y-auto">
              <div className="bg-emerald-50 px-3.5 py-2 text-xs font-bold text-emerald-900 flex items-center justify-between">
                <span>Sugestões Automáticas com Número (Indaiatuba-SP)</span>
                <button
                  type="button"
                  onClick={() => setActiveDropdown(null)}
                  className="text-emerald-700 hover:text-emerald-950 text-xs font-bold shrink-0"
                >
                  Fechar ✕
                </button>
              </div>

              {pickupSuggestions.map((sug) => (
                <div
                  key={sug.id}
                  onClick={() => handleSelectSuggestion('pickup', sug)}
                  className="p-3.5 hover:bg-emerald-50/60 cursor-pointer transition-all flex items-start gap-3"
                >
                  <MapPin className="w-4 h-4 text-emerald-600 shrink-0 mt-0.5" />
                  <div className="flex-1 min-w-0">
                    <span className="font-bold text-slate-900 text-sm sm:text-base block truncate">
                      {sug.label}
                    </span>
                    <span className="text-xs sm:text-sm text-slate-500 block truncate">
                      {sug.secondaryText}
                    </span>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>

        {/* Destination Input com Busca Automática */}
        <div className="relative w-full min-w-0">
          {/* Barra Superior do Destino */}
          <div className="flex flex-col items-start mb-2.5 w-full min-w-0">
            <label className="w-full flex items-center gap-1.5 text-[11px] min-[390px]:text-xs sm:text-sm font-heading font-black text-slate-900 uppercase tracking-tight whitespace-nowrap">
              <Navigation className="w-4 h-4 text-amber-600 shrink-0" />
              <span>Endereço de Chegada / Destino (Com Número)</span>
            </label>
          </div>

          <div className="relative w-full min-w-0">
            <input
              type="text"
              value={destInput}
              onChange={(e) => handleDestChange(e.target.value)}
              onFocus={() => {
                setActiveDropdown('destination');
                if (!destSuggestions.length) setDestSuggestions(POPULAR_DATABASE_LOCATIONS.slice(0, 4));
              }}
              placeholder="Ex: Av. dos Trabalhadores, 350"
              className={`w-full min-w-0 box-border bg-white border-2 ${
                !hasAddressNumber(destInput) && destInput.trim().length > 3
                  ? 'border-amber-400 focus:border-amber-500'
                  : 'border-slate-300 hover:border-amber-400 focus:border-amber-500'
              } rounded-2xl p-4 ${destInput || isSearchingDest ? 'pr-10' : ''} text-[14px] sm:text-base leading-snug text-slate-950 placeholder-slate-400 focus:outline-none focus:ring-4 focus:ring-amber-500/10 font-bold shadow-xs transition-all overflow-hidden text-ellipsis`}
            />
            {isSearchingDest && (
              <Loader2 className="w-5 h-5 text-amber-600 animate-spin absolute right-3.5 top-1/2 -translate-y-1/2" />
            )}
            {destInput && !isSearchingDest && (
              <button
                type="button"
                onClick={() => {
                  setDestInput('');
                  setDestination(null);
                }}
                className="absolute right-3.5 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-800 cursor-pointer p-0.5"
                title="Limpar destino"
              >
                <X className="w-5 h-5" />
              </button>
            )}
          </div>

          {/* 3. Alerta de Validação: Se endereço não tiver número */}
          {!hasAddressNumber(destInput) && destInput.trim().length > 3 && (
            <div className="mt-2.5 p-3.5 bg-amber-50 border-2 border-amber-400 rounded-2xl flex flex-col sm:flex-row sm:items-center justify-between gap-2.5 text-xs sm:text-sm text-amber-950 font-bold animate-fade-in shadow-xs">
              <div className="flex items-center gap-2">
                <AlertTriangle className="w-5 h-5 text-amber-600 shrink-0" />
                <span>Coloque o número do endereço para o motorista te achar</span>
              </div>
              <div className="flex items-center gap-1.5 self-end sm:self-center">
                <input
                  id="dest-number-input"
                  type="text"
                  placeholder="Nº"
                  defaultValue="350"
                  className="w-20 px-2.5 py-1.5 bg-white border-2 border-amber-400 rounded-xl text-xs font-black text-slate-900 focus:outline-none text-center"
                />
                <button
                  type="button"
                  onClick={() => {
                    const inputEl = document.getElementById('dest-number-input') as HTMLInputElement;
                    const num = inputEl?.value?.trim() || '350';
                    const updated = `${destInput}, ${num} - Indaiatuba-SP`;
                    setDestInput(updated);
                    setDestination({
                      address: updated,
                      lat: destination?.lat ?? -23.0805,
                      lng: destination?.lng ?? -47.2050,
                    });
                    if (addressValidationError) setAddressValidationError(null);
                  }}
                  className="px-3 py-1.5 bg-amber-500 hover:bg-amber-600 active:scale-95 text-slate-950 rounded-xl font-black text-xs cursor-pointer shadow-xs transition-all uppercase"
                >
                  Inserir Nº
                </button>
              </div>
            </div>
          )}

          {/* Dropdown de Busca Automática para Destino */}
          {activeDropdown === 'destination' && (
            <div className="absolute left-0 right-0 top-full z-50 bg-white border-2 border-amber-400 rounded-2xl shadow-2xl mt-1 overflow-hidden divide-y divide-slate-100 max-h-64 overflow-y-auto">
              <div className="bg-amber-50 px-3.5 py-1.5 text-xs font-bold text-amber-900 flex items-center justify-between">
                <span>Sugestões Automáticas com Número (Indaiatuba-SP)</span>
                <button
                  type="button"
                  onClick={() => setActiveDropdown(null)}
                  className="text-amber-700 hover:text-amber-950 text-xs font-bold"
                >
                  Fechar ✕
                </button>
              </div>

              {destSuggestions.map((sug) => (
                <div
                  key={sug.id}
                  onClick={() => handleSelectSuggestion('destination', sug)}
                  className="p-3 hover:bg-amber-50/60 cursor-pointer transition-all flex items-start gap-3"
                >
                  <Navigation className="w-4 h-4 text-amber-600 shrink-0 mt-0.5" />
                  <div className="flex-1">
                    <span className="font-bold text-slate-900 text-xs sm:text-sm block">
                      {sug.label}
                    </span>
                    <span className="text-xs text-slate-500 block truncate">
                      {sug.secondaryText}
                    </span>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>

        {/* Quick Popular Addresses */}
        <div className="pt-1 w-full min-w-0 overflow-hidden">
          <p className="text-xs text-slate-500 font-extrabold mb-2 uppercase tracking-wider flex items-center gap-1.5">
            <Search className="w-3.5 h-3.5 text-slate-400 shrink-0" />
            <span>Destinos Frequentes de Indaiatuba com Número</span>
          </p>
          <div className="flex gap-2.5 overflow-x-auto pb-1 scrollbar-none w-full min-w-0">
            {POPULAR_DATABASE_LOCATIONS.slice(0, 5).map((loc) => (
              <button
                key={loc.id}
                type="button"
                onClick={() => {
                  setDestination({ address: loc.label, lat: loc.lat, lng: loc.lng });
                  setDestInput(loc.label);
                  setActiveDropdown(null);
                  if (addressValidationError) setAddressValidationError(null);
                }}
                className="shrink-0 bg-slate-50 hover:bg-amber-50 border border-slate-300 hover:border-amber-400 text-slate-800 hover:text-amber-900 text-xs sm:text-sm font-semibold px-3 py-2 rounded-xl transition-all cursor-pointer flex items-center gap-1.5 shadow-sm max-w-[230px]"
              >
                <Clock className="w-3.5 h-3.5 text-slate-500 shrink-0" />
                <span className="truncate">{loc.mainText}</span>
              </button>
            ))}
          </div>
        </div>

        {/* Botão Buscar Corrida */}
        <button
          type="button"
          onClick={handleSearchRides}
          className="w-full min-w-0 box-border bg-[#ff6a00] hover:bg-[#e05e00] active:scale-[0.98] text-white font-heading font-black text-base sm:text-lg py-4 px-4 rounded-2xl shadow-xl flex items-center justify-center gap-2.5 border-2 border-[#ff8533] cursor-pointer transition-all uppercase tracking-wider mt-4"
        >
          <Search className="w-5 h-5 sm:w-6 sm:h-6 stroke-[2.5] shrink-0" />
          <span>Buscar corrida</span>
        </button>

        {/* Botão DESABILITADO no início (cinza, não clicável) */}
        <div className="pt-2 w-full min-w-0">
          <button
            type="button"
            disabled
            className="w-full min-w-0 box-border bg-slate-100 border-2 border-slate-300 text-slate-400 font-heading font-black text-xs sm:text-sm py-3.5 px-3 rounded-2xl flex items-center justify-center gap-2 cursor-not-allowed uppercase tracking-wider shadow-none select-none text-center leading-snug"
          >
            <Lock className="w-4 h-4 text-slate-400 shrink-0" />
            <span>Complete endereço e pagamento para ver o mapa</span>
          </button>
        </div>
      </div>
      )}

      {/* ETAPA 2: ESCOLHA DA CATEGORIA COM VALOR FINAL */}
      {!hasOpenDebt && passengerStep === 'options' && (
        <div className="space-y-4 animate-fade-in min-w-0 w-full">
          {/* Card Resumo do Trajeto com Botão Alterar Endereços */}
          <div className="bg-white border border-slate-200 rounded-3xl p-4 sm:p-5 shadow-sm flex flex-col sm:flex-row sm:items-center justify-between gap-3 min-w-0 w-full box-border">
            <div className="space-y-1.5 flex-1 min-w-0">
              <div className="flex items-center gap-2 text-xs text-slate-500 font-bold uppercase tracking-wider font-mono">
                <span>Trajeto Selecionado</span>
                <span>•</span>
                <span className="text-[#ff6a00] font-black">{dynamicDistanceKm} km</span>
              </div>
              <div className="text-xs sm:text-sm font-bold text-slate-900 truncate flex items-center gap-2">
                <MapPin className="w-4 h-4 text-emerald-600 shrink-0" />
                <span className="truncate">{pickupInput}</span>
              </div>
              <div className="text-xs sm:text-sm font-bold text-slate-900 truncate flex items-center gap-2">
                <Navigation className="w-4 h-4 text-amber-600 shrink-0" />
                <span className="truncate">{destInput}</span>
              </div>
            </div>

            <button
              type="button"
              onClick={() => setPassengerStep('search')}
              className="px-4 py-2.5 rounded-xl bg-slate-100 hover:bg-slate-200 text-slate-800 font-heading font-bold text-xs sm:text-sm flex items-center justify-center gap-1.5 transition-all cursor-pointer border border-slate-300 self-start sm:self-center shrink-0"
            >
              <ArrowLeft className="w-4 h-4" />
              <span>Alterar endereços</span>
            </button>
          </div>

          {/* BOTÃO BLOQUEADO: Só libera após as 4 etapas (Endereço início com número + Chegada com número + Escolha da opção + Pagamento/Dinheiro confirmado) */}
          <div className="w-full min-w-0">
            {isRideMapAllowed ? (
              onOpenFullMap && (
                <button
                  type="button"
                  onClick={onOpenFullMap}
                  className="w-full min-w-0 box-border bg-[#ff6a00] hover:bg-[#e05e00] active:scale-[0.98] text-white font-heading font-black text-base sm:text-lg py-4 px-4 rounded-2xl shadow-xl flex items-center justify-center gap-3 border-2 border-[#ff8533] cursor-pointer transition-all uppercase tracking-wider animate-fade-in"
                >
                  <Maximize2 className="w-6 h-6 stroke-[2.5] shrink-0" />
                  <span>VER O MAPA TELA INTEIRA</span>
                </button>
              )
            ) : (
              <div className="space-y-2">
                <button
                  type="button"
                  disabled
                  className="w-full min-w-0 box-border bg-slate-100 border-2 border-slate-300 text-slate-400 font-heading font-black text-xs sm:text-sm py-4 px-3 rounded-2xl flex items-center justify-center gap-2 cursor-not-allowed shadow-none select-none uppercase tracking-wider text-center leading-snug"
                >
                  <Lock className="w-5 h-5 text-slate-400 shrink-0" />
                  <span>Complete endereço e pagamento para ver o mapa</span>
                </button>
                <div className="flex items-center justify-center gap-2 text-[11px] text-slate-500 font-mono text-center flex-wrap">
                  <span className="text-emerald-700 font-bold">✓ 1. Endereço com número</span>
                  <span>&bull;</span>
                  <span className="text-[#ff6a00] font-black">2. Escolha sua opção abaixo</span>
                  <span>&bull;</span>
                  <span className="text-slate-400 font-bold">3. Pagamento no app</span>
                </div>
              </div>
            )}
          </div>

          {/* Opções de Corrida para Passageiro (4 Opções com VALOR FINAL) */}
          <div className="space-y-3 min-w-0">
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2">
              <label className="text-sm font-heading font-black text-slate-950 uppercase tracking-wider">
                Escolha sua Categoria de Viagem
              </label>
              <span className="text-xs text-slate-600 font-mono font-bold bg-slate-100 px-3 py-1 rounded-full border border-slate-200 self-start sm:self-auto shrink-0">
                Distância da rota: {dynamicDistanceKm} km
              </span>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3.5 min-w-0">
              {/* 1. Motorista Econômico */}
              {(() => {
                const cat = VEHICLE_CATEGORIES.economica;
                const fare = calculateFare('economica', dynamicDistanceKm);
                return (
                  <div
                    onClick={() => handleSelectCategory('economica')}
                    className="p-4 sm:p-5 rounded-2xl border-2 border-slate-200 hover:border-amber-500 bg-white transition-all cursor-pointer flex flex-col justify-between shadow-md hover:shadow-lg group min-w-0"
                  >
                    <div className="min-w-0">
                      <div className="flex flex-col sm:flex-row sm:items-start justify-between gap-2.5 min-w-0">
                        <div className="flex items-center gap-3 min-w-0 flex-1">
                          <div className="w-11 h-11 sm:w-13 sm:h-13 rounded-2xl bg-amber-100 text-amber-800 flex items-center justify-center shrink-0 border border-amber-300">
                            <Car className="w-6 h-6 sm:w-7 sm:h-7" />
                          </div>
                          <div className="min-w-0 flex-1">
                            <div className="flex items-center gap-1.5 flex-wrap">
                              <span className="font-heading font-black text-slate-950 text-base sm:text-lg leading-tight">
                                Motorista Econômico
                              </span>
                              <span className="bg-emerald-100 text-emerald-800 font-bold text-[10px] sm:text-[11px] px-2 py-0.5 rounded-full border border-emerald-300 font-mono shrink-0">
                                Mais Pedida
                              </span>
                            </div>
                            <p className="text-xs sm:text-sm text-slate-600 font-medium leading-tight mt-1">
                              {cat.capacity} &bull; {cat.estimatedTimeMin} min de espera
                            </p>
                          </div>
                        </div>

                        <div className="text-left sm:text-right shrink-0">
                          <span className="font-heading font-black text-2xl sm:text-3xl text-amber-600 whitespace-nowrap">
                            {formatBRL(fare.totalPrice)}
                          </span>
                          <p className="text-[10px] sm:text-xs text-slate-500 font-bold uppercase font-mono">Preço Final</p>
                        </div>
                      </div>

                      <div className="mt-3 text-xs text-slate-600 border-t border-slate-100 pt-2 flex flex-wrap items-center justify-between gap-1 font-medium">
                        <span>{cat.tagline}</span>
                        <span className="text-slate-500 font-mono">Ar-condicionado</span>
                      </div>
                    </div>

                    <button
                      type="button"
                      onClick={(e) => {
                        e.stopPropagation();
                        handleSelectCategory('economica');
                      }}
                      className="w-full mt-4 py-3.5 px-4 rounded-2xl font-heading font-black text-sm flex items-center justify-center gap-2 transition-all shadow-md active:scale-95 cursor-pointer bg-amber-500 hover:bg-amber-400 text-slate-950 border border-amber-400 uppercase tracking-wide"
                    >
                      <span>Escolher Econômico ({formatBRL(fare.totalPrice)})</span>
                    </button>
                  </div>
                );
              })()}

              {/* 2. Motorista Confort */}
              {(() => {
                const cat = VEHICLE_CATEGORIES.confort;
                const fare = calculateFare('confort', dynamicDistanceKm);
                return (
                  <div
                    onClick={() => handleSelectCategory('confort')}
                    className="p-4 sm:p-5 rounded-2xl border-2 border-purple-200 hover:border-purple-500 bg-white transition-all cursor-pointer flex flex-col justify-between shadow-md hover:shadow-lg group min-w-0"
                  >
                    <div className="min-w-0">
                      <div className="flex flex-col sm:flex-row sm:items-start justify-between gap-2.5 min-w-0">
                        <div className="flex items-center gap-3 min-w-0 flex-1">
                          <div className="w-11 h-11 sm:w-13 sm:h-13 rounded-2xl bg-purple-100 text-purple-800 flex items-center justify-center shrink-0 border border-purple-300">
                            <Sparkles className="w-6 h-6 sm:w-7 sm:h-7" />
                          </div>
                          <div className="min-w-0 flex-1">
                            <div className="flex items-center gap-1.5 flex-wrap">
                              <span className="font-heading font-black text-slate-950 text-base sm:text-lg leading-tight">
                                Motorista Confort
                              </span>
                              <span className="bg-purple-100 text-purple-900 font-bold text-[10px] sm:text-[11px] px-2 py-0.5 rounded-full border border-purple-300 font-mono shrink-0">
                                Mais Conforto
                              </span>
                            </div>
                            <p className="text-xs sm:text-sm text-slate-600 font-medium leading-tight mt-1">
                              Sedans e SUVs novos &bull; {cat.estimatedTimeMin} min
                            </p>
                          </div>
                        </div>

                        <div className="text-left sm:text-right shrink-0">
                          <span className="font-heading font-black text-purple-900 text-2xl sm:text-3xl whitespace-nowrap">
                            {formatBRL(fare.totalPrice)}
                          </span>
                          <p className="text-[10px] sm:text-xs text-purple-600 font-bold uppercase font-mono">Preço Final</p>
                        </div>
                      </div>

                      <div className="mt-3 text-xs text-slate-600 border-t border-slate-100 pt-2 flex flex-wrap items-center justify-between gap-1 font-medium">
                        <span>{cat.tagline}</span>
                        <span className="text-purple-700 font-bold">Mais espaço interno</span>
                      </div>
                    </div>

                    <button
                      type="button"
                      onClick={(e) => {
                        e.stopPropagation();
                        handleSelectCategory('confort');
                      }}
                      className="w-full mt-4 py-3.5 px-4 rounded-2xl font-heading font-black text-sm flex items-center justify-center gap-2 transition-all shadow-md active:scale-95 cursor-pointer bg-purple-700 hover:bg-purple-600 text-white border border-purple-600 uppercase tracking-wide"
                    >
                      <span>Escolher Confort ({formatBRL(fare.totalPrice)})</span>
                    </button>
                  </div>
                );
              })()}

              {/* 3. Motoboy Passageiro */}
              {(() => {
                const cat = VEHICLE_CATEGORIES.moto_passageiro;
                const fare = calculateFare('moto_passageiro', dynamicDistanceKm);
                return (
                  <div
                    onClick={() => handleSelectCategory('moto_passageiro')}
                    className="p-4 sm:p-5 rounded-2xl border-2 border-cyan-200 hover:border-cyan-500 bg-white transition-all cursor-pointer flex flex-col justify-between shadow-md hover:shadow-lg group min-w-0"
                  >
                    <div className="min-w-0">
                      <div className="flex flex-col sm:flex-row sm:items-start justify-between gap-2.5 min-w-0">
                        <div className="flex items-center gap-3 min-w-0 flex-1">
                          <div className="w-11 h-11 sm:w-13 sm:h-13 rounded-2xl bg-cyan-100 text-cyan-800 flex items-center justify-center shrink-0 border border-cyan-300">
                            <Bike className="w-6 h-6 sm:w-7 sm:h-7" />
                          </div>
                          <div className="min-w-0 flex-1">
                            <div className="flex items-center gap-1.5 flex-wrap">
                              <span className="font-heading font-black text-slate-950 text-base sm:text-lg leading-tight">
                                Motoboy Passageiro
                              </span>
                              <span className="bg-cyan-100 text-cyan-900 font-bold text-[10px] sm:text-[11px] px-2 py-0.5 rounded-full border border-cyan-300 font-mono shrink-0">
                                Mais Rápido
                              </span>
                            </div>
                            <p className="text-xs sm:text-sm text-slate-600 font-medium leading-tight mt-1">
                              Rápido no trânsito &bull; {cat.estimatedTimeMin} min
                            </p>
                          </div>
                        </div>

                        <div className="text-left sm:text-right shrink-0">
                          <span className="font-heading font-black text-cyan-900 text-2xl sm:text-3xl whitespace-nowrap">
                            {formatBRL(fare.totalPrice)}
                          </span>
                          <p className="text-[10px] sm:text-xs text-cyan-600 font-bold uppercase font-mono">Preço Final</p>
                        </div>
                      </div>

                      <div className="mt-3 text-xs text-slate-600 border-t border-slate-100 pt-2 flex flex-wrap items-center justify-between gap-1 font-medium">
                        <span>{cat.tagline}</span>
                        <span className="text-cyan-700 font-bold">Capacete incluso</span>
                      </div>
                    </div>

                    <button
                      type="button"
                      onClick={(e) => {
                        e.stopPropagation();
                        handleSelectCategory('moto_passageiro');
                      }}
                      className="w-full mt-4 py-3.5 px-4 rounded-2xl font-heading font-black text-sm flex items-center justify-center gap-2 transition-all shadow-md active:scale-95 cursor-pointer bg-cyan-600 hover:bg-cyan-500 text-white border border-cyan-500 uppercase tracking-wide"
                    >
                      <span>Escolher Motoboy Passageiro ({formatBRL(fare.totalPrice)})</span>
                    </button>
                  </div>
                );
              })()}

              {/* 4. Motoboy Entregas */}
              {(() => {
                const cat = VEHICLE_CATEGORIES.moto_entrega;
                const fare = calculateFare('moto_entrega', dynamicDistanceKm);
                return (
                  <div
                    onClick={() => handleSelectCategory('moto_entrega')}
                    className="p-4 sm:p-5 rounded-2xl border-2 border-amber-200 hover:border-amber-500 bg-white transition-all cursor-pointer flex flex-col justify-between shadow-md hover:shadow-lg group min-w-0"
                  >
                    <div className="min-w-0">
                      <div className="flex flex-col sm:flex-row sm:items-start justify-between gap-2.5 min-w-0">
                        <div className="flex items-center gap-3 min-w-0 flex-1">
                          <div className="w-11 h-11 sm:w-13 sm:h-13 rounded-2xl bg-amber-100 text-amber-800 flex items-center justify-center shrink-0 border border-amber-300">
                            <PackageCheck className="w-6 h-6 sm:w-7 sm:h-7" />
                          </div>
                          <div className="min-w-0 flex-1">
                            <div className="flex items-center gap-1.5 flex-wrap">
                              <span className="font-heading font-black text-slate-950 text-base sm:text-lg leading-tight">
                                Motoboy Entregas
                              </span>
                              <span className="bg-amber-100 text-amber-900 font-bold text-[10px] sm:text-[11px] px-2 py-0.5 rounded-full border border-amber-300 font-mono shrink-0">
                                Flash Delivery
                              </span>
                            </div>
                            <p className="text-xs sm:text-sm text-slate-600 font-medium leading-tight mt-1">
                              Delivery & Encomendas &bull; {cat.estimatedTimeMin} min
                            </p>
                          </div>
                        </div>

                        <div className="text-left sm:text-right shrink-0">
                          <span className="font-heading font-black text-2xl sm:text-3xl text-amber-600 whitespace-nowrap">
                            {formatBRL(fare.totalPrice)}
                          </span>
                          <p className="text-[10px] sm:text-xs text-slate-500 font-bold uppercase font-mono">Preço Final</p>
                        </div>
                      </div>

                      <div className="mt-3 text-xs text-slate-600 border-t border-slate-100 pt-2 flex flex-wrap items-center justify-between gap-1 font-medium">
                        <span>{cat.tagline}</span>
                        <span className="text-amber-700 font-bold">Baú até 20kg</span>
                      </div>
                    </div>

                    <button
                      type="button"
                      onClick={(e) => {
                        e.stopPropagation();
                        handleSelectCategory('moto_entrega');
                      }}
                      className="w-full mt-4 py-3.5 px-4 rounded-2xl font-heading font-black text-sm flex items-center justify-center gap-2 transition-all shadow-md active:scale-95 cursor-pointer bg-gradient-to-r from-amber-500 via-amber-400 to-amber-500 hover:brightness-105 text-slate-950 border border-amber-400 uppercase tracking-wide"
                    >
                      <span>Escolher Entregas ({formatBRL(fare.totalPrice)})</span>
                    </button>
                  </div>
                );
              })()}
            </div>
          </div>
        </div>
      )}

      {/* ETAPA 3: PÁGINA DE PAGAMENTO NO APP COM DESCONTO/RETENÇÃO */}
      {!hasOpenDebt && passengerStep === 'payment' && (() => {
        const fare = calculateFare(selectedCategory, dynamicDistanceKm);
        const isMoto = selectedCategory === 'moto_passageiro' || selectedCategory === 'moto_entrega';
        // Código PIX completo retornado pelo Asaas (sem nenhum corte por slice ou substring)
        const pixPayloadCompleto = (
          asaasPayment?.pixQrCode?.payload ||
          (asaasPayment?.pixQrCode as any)?.pixCopyPaste ||
          generateFallbackPixCopiaECola(fare.totalPrice, `RACE${Math.round(fare.totalPrice * 100)}`)
        ).trim();

        return (
          <div className="space-y-4 animate-fade-in min-w-0 w-full">
            {/* Botão Voltar às Opções */}
            <button
              type="button"
              onClick={() => {
                setPassengerStep('options');
                setIsPaidInApp(false);
              }}
              className="inline-flex items-center gap-2 text-slate-700 hover:text-slate-950 font-heading font-bold text-sm bg-slate-100 hover:bg-slate-200 px-4 py-2.5 rounded-xl border border-slate-300 transition-all cursor-pointer shadow-2xs"
            >
              <ArrowLeft className="w-4 h-4" />
              <span>Voltar às opções de viagem</span>
            </button>

            {/* Card Principal: "Você escolheu [Categoria] - R$ [Valor]" */}
            <div className="bg-gradient-to-br from-amber-500/10 via-orange-500/10 to-amber-500/10 border-2 border-[#ff6a00] rounded-3xl p-4 sm:p-6 shadow-md space-y-4 min-w-0 w-full box-border">
              <div className="flex items-start justify-between gap-3 border-b border-orange-200/80 pb-3 min-w-0">
                <div className="min-w-0 flex-1">
                  <span className="text-[11px] font-bold text-slate-500 uppercase tracking-wider block font-mono">
                    Resumo do Pedido de Corrida
                  </span>
                  <h3 className="text-lg sm:text-2xl font-heading font-black text-slate-950 mt-1 break-words">
                    Você escolheu {getCategoryDisplayName(selectedCategory)} - {formatBRL(fare.totalPrice)}
                  </h3>
                </div>
                <div className="w-11 h-11 sm:w-12 sm:h-12 rounded-2xl bg-[#ff6a00] text-white flex items-center justify-center font-bold shrink-0 shadow-md">
                  {isMoto ? <Bike className="w-6 h-6" /> : <Car className="w-6 h-6" />}
                </div>
              </div>

              {/* Rota */}
              <div className="space-y-2 text-xs sm:text-sm text-slate-800 bg-white/80 rounded-2xl p-3.5 sm:p-4 border border-orange-200 min-w-0">
                <div className="flex items-start gap-2.5 min-w-0">
                  <MapPin className="w-4 h-4 text-emerald-600 shrink-0 mt-0.5" />
                  <div className="min-w-0 flex-1">
                    <span className="text-[10px] font-bold text-emerald-700 uppercase block font-mono">Embarque</span>
                    <span className="font-bold text-slate-950 break-words">{pickupInput}</span>
                  </div>
                </div>
                <div className="flex items-start gap-2.5 pt-2 border-t border-slate-100 min-w-0">
                  <Navigation className="w-4 h-4 text-amber-600 shrink-0 mt-0.5" />
                  <div className="min-w-0 flex-1">
                    <span className="text-[10px] font-bold text-amber-700 uppercase block font-mono">Destino</span>
                    <span className="font-bold text-slate-950 break-words">{destInput}</span>
                  </div>
                </div>
                <div className="pt-2 border-t border-slate-100 flex items-center justify-between text-xs text-slate-600 font-mono">
                  <span>Distância da Rota:</span>
                  <span className="font-black text-[#ff6a00]">{dynamicDistanceKm} km</span>
                </div>
              </div>
            </div>

            {/* Formas de Pagamento no App (PIX no app / Cartão no app) */}
            <div className="bg-white border border-slate-200 rounded-3xl p-4 sm:p-6 shadow-md space-y-4 min-w-0 w-full box-border overflow-hidden">
              <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 pb-3 border-b border-slate-200">
                <div className="flex items-center gap-2 min-w-0">
                  <Lock className="w-5 h-5 text-emerald-600 shrink-0" />
                  <h4 className="font-heading font-black text-slate-950 text-sm sm:text-base uppercase tracking-wider">
                    Forma de Pagamento no App
                  </h4>
                </div>
                <span className="text-[11px] font-bold text-emerald-700 bg-emerald-50 px-2.5 py-1 rounded-full border border-emerald-200 font-mono self-start sm:self-auto shrink-0">
                  100% SEGURO
                </span>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-3 gap-2.5 sm:gap-3 w-full min-w-0">
                <button
                  type="button"
                  onClick={() => {
                    setPaymentMethod('pix');
                    initAsaasPayment('pix', selectedCategory);
                  }}
                  className={`min-w-0 p-3.5 sm:p-4 rounded-2xl border-2 flex flex-row sm:flex-col items-center justify-between sm:justify-center gap-2 sm:gap-1 transition-all cursor-pointer text-left sm:text-center ${
                    paymentMethod === 'pix'
                      ? 'bg-emerald-50 border-emerald-500 text-emerald-950 font-black shadow-sm ring-2 ring-emerald-500/20'
                      : 'bg-slate-50 border-slate-200 text-slate-700 hover:bg-white'
                  }`}
                >
                  <div className="flex items-center sm:flex-col gap-2.5 sm:gap-1">
                    <QrCode className="w-6 h-6 text-emerald-600 shrink-0" />
                    <span className="text-sm font-black leading-tight">PIX no app</span>
                  </div>
                  <span className="text-xs text-emerald-700 font-bold leading-tight">Asaas Instantâneo</span>
                </button>

                <button
                  type="button"
                  onClick={() => {
                    setPaymentMethod('credit_card');
                    initAsaasPayment('credit_card', selectedCategory);
                  }}
                  className={`min-w-0 p-3.5 sm:p-4 rounded-2xl border-2 flex flex-row sm:flex-col items-center justify-between sm:justify-center gap-2 sm:gap-1 transition-all cursor-pointer text-left sm:text-center ${
                    paymentMethod === 'credit_card'
                      ? 'bg-amber-50 border-amber-500 text-amber-950 font-black shadow-sm ring-2 ring-amber-500/20'
                      : 'bg-slate-50 border-slate-200 text-slate-700 hover:bg-white'
                  }`}
                >
                  <div className="flex items-center sm:flex-col gap-2.5 sm:gap-1">
                    <CreditCard className="w-6 h-6 text-amber-600 shrink-0" />
                    <span className="text-sm font-black leading-tight">Cartão no app</span>
                  </div>
                  <span className="text-xs text-amber-700 font-bold leading-tight">Link Seguro Asaas</span>
                </button>

                <button
                  type="button"
                  onClick={() => {
                    if (pollingTimerRef.current) clearInterval(pollingTimerRef.current);
                    setIsPollingAsaas(false);
                    setPaymentMethod('dinheiro');
                  }}
                  className={`min-w-0 p-3.5 sm:p-4 rounded-2xl border-2 flex flex-row sm:flex-col items-center justify-between sm:justify-center gap-2 sm:gap-1 transition-all cursor-pointer text-left sm:text-center ${
                    isCashMethod(paymentMethod)
                      ? 'bg-blue-50 border-blue-500 text-blue-950 font-black shadow-sm ring-2 ring-blue-500/20'
                      : 'bg-slate-50 border-slate-200 text-slate-700 hover:bg-white'
                  }`}
                >
                  <div className="flex items-center sm:flex-col gap-2.5 sm:gap-1">
                    <Wallet className="w-6 h-6 text-blue-600 shrink-0" />
                    <span className="text-sm font-black leading-tight">Dinheiro</span>
                  </div>
                  <span className="text-xs text-blue-700 font-bold leading-tight">Ao condutor</span>
                </button>
              </div>

              {/* Alerta quando tentar pedir corrida sem pagar no Asaas */}
              {paymentBlockedError && !isCashMethod(paymentMethod) && (
                <div className="bg-rose-50 border-2 border-rose-500 rounded-2xl p-3.5 sm:p-4 flex items-center gap-3 text-rose-950 shadow-sm animate-fade-in min-w-0">
                  <AlertTriangle className="w-5 h-5 text-rose-600 shrink-0" />
                  <span className="text-xs sm:text-sm font-black break-words">{paymentBlockedError}</span>
                </div>
              )}

              {/* FLUXO PIX NO APP VIA ASAAS */}
              {paymentMethod === 'pix' && (
                <div className="space-y-4 pt-2 min-w-0">
                  <div className="bg-slate-50 border border-slate-200 rounded-3xl p-4 sm:p-5 text-center space-y-4 min-w-0 overflow-hidden">
                    <div className="flex flex-wrap items-center justify-between gap-2 border-b border-slate-200 pb-3">
                      <div className="text-left">
                        <span className="text-[10px] font-mono font-bold text-slate-500 uppercase block">Gateway de Pagamento</span>
                        <span className="font-heading font-black text-slate-900 text-sm flex items-center gap-1.5">
                          <CheckCircle2 className="w-4 h-4 text-emerald-600 shrink-0" /> PIX Asaas Integrado
                        </span>
                      </div>
                      <span className="text-xs font-mono font-bold text-emerald-700 bg-emerald-100 px-2.5 py-1 rounded-full border border-emerald-300 shrink-0">
                        {formatBRL(fare.totalPrice)}
                      </span>
                    </div>

                    {isLoadingAsaas ? (
                      <div className="py-12 flex flex-col items-center justify-center gap-3">
                        <Loader2 className="w-10 h-10 animate-spin text-[#ff6a00]" />
                        <p className="text-xs sm:text-sm font-bold text-slate-700">
                          Gerando cobrança PIX no Asaas com valor de {formatBRL(fare.totalPrice)}...
                        </p>
                      </div>
                    ) : (
                      <>
                        {/* Imagem do QR Code Asaas */}
                        <div className="py-2">
                          {asaasPayment?.pixQrCode?.encodedImage ? (
                            <img
                              src={asaasPayment.pixQrCode.encodedImage}
                              alt="QR Code PIX Asaas"
                              className="w-52 h-52 sm:w-64 sm:h-64 mx-auto rounded-2xl border-2 border-emerald-500 shadow-md p-2 bg-white object-contain"
                            />
                          ) : (
                            <div className="w-52 h-52 sm:w-56 sm:h-56 mx-auto bg-white p-3 border-2 border-emerald-500 rounded-2xl shadow-inner flex items-center justify-center">
                              <QrCode className="w-32 h-32 sm:w-36 sm:h-36 text-slate-900" />
                            </div>
                          )}
                          <p className="text-xs text-slate-500 mt-2 font-medium">
                            Escaneie com o app do seu banco ou copie o código abaixo
                          </p>
                        </div>

                        {/* Código PIX Copia e Cola Completo do Asaas */}
                        <div className="space-y-3 text-left bg-white p-3.5 sm:p-5 rounded-2xl border-2 border-emerald-500 shadow-sm min-w-0 max-w-full overflow-hidden">
                          <div className="flex flex-wrap items-center justify-between gap-1.5">
                            <label className="text-xs font-heading font-black text-slate-900 uppercase flex items-center gap-1.5">
                              <Copy className="w-4 h-4 text-emerald-600 shrink-0" />
                              <span>PIX Copia e Cola Completo ({formatBRL(fare.totalPrice)})</span>
                            </label>
                            <span className="text-[10px] font-mono font-bold text-emerald-800 bg-emerald-100 px-2 py-0.5 rounded-full border border-emerald-300 shrink-0">
                              {pixPayloadCompleto.length} CARACTERES
                            </span>
                          </div>

                          <p className="text-xs text-slate-600">
                            Copie o código completo abaixo e cole no seu banco (opção <strong>PIX Copia e Cola</strong>):
                          </p>

                          {/* Caixa com scroll horizontal visível para o passageiro ver o código inteiro */}
                          <div className="w-full max-w-full min-w-0 bg-slate-50 border-2 border-slate-300 rounded-xl p-3 overflow-x-auto whitespace-nowrap scrollbar-thin scrollbar-thumb-emerald-500 box-border">
                            <code className="text-xs font-mono font-bold text-slate-900 select-all tracking-tight inline-block cursor-text">
                              {pixPayloadCompleto}
                            </code>
                          </div>

                          {/* Botão Copiar o pixPayloadCompleto inteiro */}
                          <button
                            type="button"
                            onClick={async () => {
                              if (!pixPayloadCompleto) return;
                              try {
                                if (navigator?.clipboard?.writeText) {
                                  await navigator.clipboard.writeText(pixPayloadCompleto);
                                } else {
                                  const ta = document.createElement('textarea');
                                  ta.value = pixPayloadCompleto;
                                  ta.style.position = 'fixed';
                                  ta.style.opacity = '0';
                                  document.body.appendChild(ta);
                                  ta.focus();
                                  ta.select();
                                  document.execCommand('copy');
                                  document.body.removeChild(ta);
                                }
                                setPixCopied(true);
                                setTimeout(() => setPixCopied(false), 4000);
                              } catch (err) {
                                console.error('Erro ao copiar código PIX:', err);
                              }
                            }}
                            className="w-full py-3.5 px-4 bg-emerald-600 hover:bg-emerald-700 active:scale-[0.99] text-white font-heading font-black text-sm rounded-xl shadow-md transition-all cursor-pointer flex items-center justify-center gap-2 uppercase tracking-wider"
                          >
                            {pixCopied ? (
                              <>
                                <Check className="w-5 h-5 text-white stroke-[2.5]" />
                                <span>Código PIX copiado!</span>
                              </>
                            ) : (
                              <>
                                <Copy className="w-5 h-5 text-white" />
                                <span>Copiar Código PIX Completo</span>
                              </>
                            )}
                          </button>

                          {pixCopied && (
                            <div className="p-2.5 bg-emerald-50 border border-emerald-400 rounded-xl text-center text-xs font-bold text-emerald-950 animate-fade-in flex items-center justify-center gap-2">
                              <CheckCircle2 className="w-4 h-4 text-emerald-600 shrink-0" />
                              <span>Código PIX copiado! Cole no seu banco para pagar {formatBRL(fare.totalPrice)}.</span>
                            </div>
                          )}
                        </div>

                        {/* Texto verde em tempo real e botão CINZA desabilitado até o Asaas confirmar RECEIVED / CONFIRMED */}
                        {isPaidInApp && (asaasConfirmedStatus === 'RECEIVED' || asaasConfirmedStatus === 'CONFIRMED') ? (
                          <div className="p-3.5 bg-emerald-100 border-2 border-emerald-500 rounded-2xl flex items-center justify-center gap-2 text-xs sm:text-sm font-black text-emerald-950">
                            <CheckCircle2 className="w-5 h-5 text-emerald-600 shrink-0" />
                            <span>Asaas confirmou o pagamento ({asaasConfirmedStatus})! Clique abaixo para ver o mapa.</span>
                          </div>
                        ) : (
                          <div className="p-3 bg-emerald-50 border border-emerald-200 rounded-2xl flex items-center justify-center gap-2 text-xs sm:text-sm font-bold text-emerald-700">
                            <Loader2 className={`w-4 h-4 text-emerald-600 shrink-0 ${isPollingAsaas ? 'animate-spin' : ''}`} />
                            <span>Aguardando confirmação do Asaas em tempo real...</span>
                          </div>
                        )}

                        {isPaidInApp && (asaasConfirmedStatus === 'RECEIVED' || asaasConfirmedStatus === 'CONFIRMED') ? (
                          <button
                            type="button"
                            onClick={handleConfirmRideAfterPayment}
                            className="w-full font-heading font-black text-base sm:text-lg py-4 px-6 rounded-2xl shadow-xl flex items-center justify-center gap-3 border-2 transition-all uppercase tracking-wider bg-emerald-600 hover:bg-emerald-500 active:scale-[0.98] text-white border-emerald-400 cursor-pointer"
                          >
                            <CheckCircle2 className="w-6 h-6 text-white stroke-[2.5]" />
                            <span>Pagamento confirmado! Ver mapa</span>
                          </button>
                        ) : (
                          <button
                            type="button"
                            disabled
                            className="w-full font-heading font-black text-base sm:text-lg py-4 px-6 rounded-2xl shadow-none flex items-center justify-center gap-3 border-2 uppercase tracking-wider bg-slate-300 text-slate-600 border-slate-400 cursor-not-allowed opacity-85 pointer-events-none select-none"
                          >
                            <Lock className="w-5 h-5 text-slate-500 shrink-0" />
                            <span>Aguardando pagamento...</span>
                          </button>
                        )}
                      </>
                    )}
                  </div>
                </div>
              )}

              {/* FLUXO CARTÃO NO APP VIA LINK / CHECKOUT ASAAS */}
              {paymentMethod === 'credit_card' && (
                <div className="space-y-4 pt-2">
                  <div className="bg-slate-50 border border-slate-200 rounded-3xl p-5 space-y-4">
                    <div className="flex items-center justify-between border-b border-slate-200 pb-3">
                      <div>
                        <span className="text-[10px] font-mono font-bold text-slate-500 uppercase block">Cartão no App</span>
                        <span className="font-heading font-black text-slate-900 text-sm flex items-center gap-1.5">
                          <CreditCard className="w-4 h-4 text-amber-600" /> Pagamento Seguro Asaas
                        </span>
                      </div>
                      <span className="text-xs font-mono font-bold text-amber-800 bg-amber-100 px-2.5 py-1 rounded-full border border-amber-300">
                        {formatBRL(fare.totalPrice)}
                      </span>
                    </div>

                    {/* Botão Link de Pagamento Asaas Oficial */}
                    {asaasPayment?.invoiceUrl && (
                      <a
                        href={asaasPayment.invoiceUrl}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="w-full bg-amber-600 hover:bg-amber-700 text-white font-heading font-bold text-xs sm:text-sm py-3 px-4 rounded-xl shadow-sm flex items-center justify-center gap-2 transition-all block text-center"
                      >
                        <span>Abrir Link de Pagamento Asaas em Nova Aba</span>
                        <ExternalLink className="w-4 h-4" />
                      </a>
                    )}

                    {/* Formulário de Cartão conectado ao Asaas */}
                    <div className="space-y-3 bg-white p-4 rounded-2xl border border-slate-200">
                      <div>
                        <label className="text-[11px] font-bold text-slate-700 block mb-1">
                          Número do Cartão de Crédito
                        </label>
                        <input
                          type="text"
                          value={cardNumber}
                          onChange={(e) => setCardNumber(e.target.value)}
                          placeholder="0000 0000 0000 0000"
                          maxLength={19}
                          className="w-full bg-slate-50 border border-slate-200 rounded-xl px-3 py-2 text-xs font-mono text-slate-900 focus:outline-none focus:border-amber-500 font-bold"
                        />
                      </div>

                      <div>
                        <label className="text-[11px] font-bold text-slate-700 block mb-1">
                          Nome Impresso no Cartão
                        </label>
                        <input
                          type="text"
                          value={cardHolder}
                          onChange={(e) => setCardHolder(e.target.value)}
                          placeholder="NOME COMO NO CARTÃO"
                          className="w-full bg-slate-50 border border-slate-200 rounded-xl px-3 py-2 text-xs text-slate-900 focus:outline-none focus:border-amber-500 uppercase font-bold"
                        />
                      </div>

                      <div className="grid grid-cols-2 gap-3">
                        <div>
                          <label className="text-[11px] font-bold text-slate-700 block mb-1">
                            Validade
                          </label>
                          <input
                            type="text"
                            value={cardExpiry}
                            onChange={(e) => setCardExpiry(e.target.value)}
                            placeholder="MM/AA"
                            maxLength={5}
                            className="w-full bg-slate-50 border border-slate-200 rounded-xl px-3 py-2 text-xs font-mono text-slate-900 focus:outline-none focus:border-amber-500 font-bold"
                          />
                        </div>
                        <div>
                          <label className="text-[11px] font-bold text-slate-700 block mb-1">
                            CVV
                          </label>
                          <input
                            type="text"
                            value={cardCvv}
                            onChange={(e) => setCardCvv(e.target.value)}
                            placeholder="123"
                            maxLength={4}
                            className="w-full bg-slate-50 border border-slate-200 rounded-xl px-3 py-2 text-xs font-mono text-slate-900 focus:outline-none focus:border-amber-500 font-bold"
                          />
                        </div>
                      </div>

                      <div className="grid grid-cols-2 gap-3">
                        <div>
                          <label className="text-[11px] font-bold text-slate-700 block mb-1">
                            CPF do Titular
                          </label>
                          <input
                            type="text"
                            value={cardHolderCpf}
                            onChange={(e) => setCardHolderCpf(e.target.value)}
                            placeholder="000.000.000-00"
                            maxLength={14}
                            className="w-full bg-slate-50 border border-slate-200 rounded-xl px-3 py-2 text-xs font-mono text-slate-900 focus:outline-none focus:border-amber-500 font-bold"
                          />
                        </div>
                        <div>
                          <label className="text-[11px] font-bold text-slate-700 block mb-1">
                            CEP da Fatura
                          </label>
                          <input
                            type="text"
                            value={cardHolderCep}
                            onChange={(e) => setCardHolderCep(e.target.value)}
                            placeholder="13330-000"
                            maxLength={9}
                            className="w-full bg-slate-50 border border-slate-200 rounded-xl px-3 py-2 text-xs font-mono text-slate-900 focus:outline-none focus:border-amber-500 font-bold"
                          />
                        </div>
                      </div>

                      <button
                        type="button"
                        onClick={handlePayCardWithAsaas}
                        disabled={isProcessingPayment || isPaidInApp}
                        className="w-full bg-slate-900 hover:bg-slate-800 text-white font-heading font-black text-xs sm:text-sm py-3 px-4 rounded-xl shadow-md flex items-center justify-center gap-2 cursor-pointer transition-all uppercase tracking-wider disabled:opacity-60"
                      >
                        {isProcessingPayment ? (
                          <>
                            <Loader2 className="w-4 h-4 animate-spin text-white" />
                            <span>Validando Cartão no Asaas...</span>
                          </>
                        ) : (
                          <>
                            <CreditCard className="w-4 h-4 text-amber-400" />
                            <span>Autorizar Cartão no Asaas ({formatBRL(fare.totalPrice)})</span>
                          </>
                        )}
                      </button>
                    </div>

                    {isPaidInApp && (asaasConfirmedStatus === 'RECEIVED' || asaasConfirmedStatus === 'CONFIRMED') ? (
                      <div className="p-3.5 bg-emerald-100 border-2 border-emerald-500 rounded-2xl flex items-center justify-center gap-2 text-xs sm:text-sm font-black text-emerald-950">
                        <CheckCircle2 className="w-5 h-5 text-emerald-600 shrink-0" />
                        <span>Asaas confirmou o pagamento ({asaasConfirmedStatus})! Clique abaixo para ver o mapa.</span>
                      </div>
                    ) : (
                      <div className="p-3 bg-emerald-50 border border-emerald-200 rounded-2xl flex items-center justify-center gap-2 text-xs sm:text-sm font-bold text-emerald-700">
                        <Loader2 className={`w-4 h-4 text-emerald-600 shrink-0 ${isPollingAsaas ? 'animate-spin' : ''}`} />
                        <span>Aguardando confirmação do Asaas em tempo real...</span>
                      </div>
                    )}

                    {isPaidInApp && (asaasConfirmedStatus === 'RECEIVED' || asaasConfirmedStatus === 'CONFIRMED') ? (
                      <button
                        type="button"
                        onClick={handleConfirmRideAfterPayment}
                        className="w-full font-heading font-black text-base sm:text-lg py-4 px-6 rounded-2xl shadow-xl flex items-center justify-center gap-3 border-2 transition-all uppercase tracking-wider bg-emerald-600 hover:bg-emerald-500 active:scale-[0.98] text-white border-emerald-400 cursor-pointer"
                      >
                        <CheckCircle2 className="w-6 h-6 text-white stroke-[2.5]" />
                        <span>Pagamento confirmado! Ver mapa</span>
                      </button>
                    ) : (
                      <button
                        type="button"
                        disabled
                        className="w-full font-heading font-black text-base sm:text-lg py-4 px-6 rounded-2xl shadow-none flex items-center justify-center gap-3 border-2 uppercase tracking-wider bg-slate-300 text-slate-600 border-slate-400 cursor-not-allowed opacity-85 pointer-events-none select-none"
                      >
                        <Lock className="w-5 h-5 text-slate-500 shrink-0" />
                        <span>Aguardando pagamento...</span>
                      </button>
                    )}
                  </div>
                </div>
              )}

              {/* FLUXO DINHEIRO (SEM ASAAS - CRIA NA HORA NO SUPABASE) */}
              {isCashMethod(paymentMethod) && (
                <div className="space-y-4 pt-2">
                  <div className="bg-slate-50 border border-slate-200 rounded-3xl p-5 space-y-4 text-center">
                    <div className="flex items-center justify-between border-b border-slate-200 pb-3">
                      <div className="text-left">
                        <span className="text-[10px] font-mono font-bold text-slate-500 uppercase block">Pagamento em Espécie</span>
                        <span className="font-heading font-black text-slate-900 text-sm flex items-center gap-1.5">
                          <Wallet className="w-4 h-4 text-blue-600" /> Dinheiro direto ao condutor
                        </span>
                      </div>
                      <span className="text-xs font-mono font-bold text-blue-800 bg-blue-100 px-2.5 py-1 rounded-full border border-blue-300">
                        {formatBRL(fare.totalPrice)}
                      </span>
                    </div>

                    <div className="bg-blue-50 border border-blue-200 rounded-2xl p-3.5 text-xs sm:text-sm text-blue-950 font-bold">
                      Você vai pagar em dinheiro para o motorista - Motorista vai confirmar recebimento no final ({formatBRL(fare.totalPrice)}).
                    </div>

                    <button
                      type="button"
                      onClick={handleConfirmMoneyRide}
                      className="w-full bg-[#ff6a00] hover:bg-[#e05e00] active:scale-[0.98] text-white font-heading font-black text-base sm:text-lg py-4 px-6 rounded-2xl shadow-xl flex items-center justify-center gap-3 border-2 border-[#ff8533] cursor-pointer transition-all uppercase tracking-wider"
                    >
                      <CheckCircle2 className="w-6 h-6 text-white stroke-[2.5]" />
                      <span>Confirmar e chamar motorista (Dinheiro)</span>
                    </button>
                  </div>
                </div>
              )}
            </div>
          </div>
        );
      })()}

      {/* Safety & 100% Policy Guarantee Banner */}
      <div className="bg-slate-50 border border-slate-200 rounded-2xl p-4 flex flex-col sm:flex-row sm:items-center justify-between gap-2.5 text-xs sm:text-sm text-slate-700 shadow-sm font-medium min-w-0 w-full box-border">
        <div className="flex items-start sm:items-center gap-2.5 min-w-0 flex-1">
          <ShieldCheck className="w-5 h-5 text-amber-600 shrink-0 mt-0.5 sm:mt-0" />
          <span className="leading-snug">Motoristas verificados com CNH, antecedentes criminais e telemetria 24h</span>
        </div>
        <span className="font-mono text-amber-700 font-extrabold bg-amber-50 px-2.5 py-1 rounded-md border border-amber-200 self-start sm:self-auto shrink-0">
          RACE 24H
        </span>
      </div>
    </div>
  );
};
