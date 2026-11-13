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
  checkAsaasPaymentStatus,
  markAsaasPaymentPaidLocally,
  generateFallbackPixCopiaECola,
  AsaasPaymentResult,
  getAsaasApiKey,
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

  // Estados Asaas
  const [asaasPayment, setAsaasPayment] = useState<AsaasPaymentResult | null>(null);
  const [isLoadingAsaas, setIsLoadingAsaas] = useState(false);
  const [isPollingAsaas, setIsPollingAsaas] = useState(false);
  const [cardHolder, setCardHolder] = useState('');
  const [cardNumber, setCardNumber] = useState('');
  const [cardExpiry, setCardExpiry] = useState('');
  const [cardCvv, setCardCvv] = useState('');
  const pollingTimerRef = useRef<any>(null);

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

    // Dinheiro: cria imediatamente com status 'procurando_motorista' e forma_pagamento 'dinheiro' (SEM Asaas)
    // PIX / Cartão: criado apenas após confirmação no Asaas
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
      status: isCash ? 'procurando_motorista' : 'searching',
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

  // Monitora e pesquisa aprovação no Asaas a cada 3 segundos
  useEffect(() => {
    if (passengerStep !== 'payment' || !asaasPayment?.id || isPaidInApp) {
      if (pollingTimerRef.current) clearInterval(pollingTimerRef.current);
      return;
    }

    setIsPollingAsaas(true);
    pollingTimerRef.current = setInterval(async () => {
      try {
        const check = await checkAsaasPaymentStatus(asaasPayment.id);
        if (check.isPaid) {
          clearInterval(pollingTimerRef.current);
          setIsPollingAsaas(false);
          setIsPaidInApp(true);
          try {
            confetti({ particleCount: 60, spread: 70, origin: { y: 0.6 } });
          } catch {}
          // Quando Asaas confirmar pagamento, ir direto para VER MAPA NA TELA CHEIA
          setTimeout(() => {
            handleConfirmRideAfterPayment();
          }, 600);
        }
      } catch {}
    }, 3000);

    return () => {
      if (pollingTimerRef.current) clearInterval(pollingTimerRef.current);
    };
  }, [passengerStep, asaasPayment?.id, isPaidInApp]);

  const handleSelectCategory = (cat: VehicleCategory) => {
    setSelectedCategory(cat);
    setIsPaidInApp(false);
    setPassengerStep('payment');
    initAsaasPayment(paymentMethod, cat);
  };

  // Fluxo DINHEIRO: cria corrida NA HORA no Supabase sem esperar confirmação do Asaas
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
    handleRequestRideWithCategory(selectedCategory, 'dinheiro');
    setPassengerStep('search');
    if (onOpenFullMap) {
      onOpenFullMap();
    }
  };

  // Fluxo PIX / CARTÃO: mantém confirmação pelo Asaas antes de criar a corrida
  const handlePayInAppAction = () => {
    if (isCashMethod(paymentMethod)) {
      handleConfirmMoneyRide();
      return;
    }
    setIsProcessingPayment(true);
    if (asaasPayment?.id) {
      markAsaasPaymentPaidLocally(asaasPayment.id);
    }
    setTimeout(() => {
      setIsProcessingPayment(false);
      setIsPaidInApp(true);
      try {
        confetti({
          particleCount: 60,
          spread: 70,
          origin: { y: 0.6 },
        });
      } catch {}
      // Quando Asaas confirmar pagamento, ir direto para VER MAPA NA TELA CHEIA
      setTimeout(() => {
        handleConfirmRideAfterPayment();
      }, 700);
    }, 600);
  };

  const handleConfirmRideAfterPayment = () => {
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
    <div className="space-y-5">
      {/* 1. Login / Cadastro Success Direct Entry Notification */}
      {loginSuccessBanner && (
        <div className="bg-emerald-50 border-2 border-emerald-400 rounded-3xl p-4 sm:p-5 flex items-center justify-between shadow-sm animate-fade-in">
          <div className="flex items-center gap-3.5">
            <div className="w-11 h-11 rounded-2xl bg-emerald-500 text-slate-950 flex items-center justify-center font-black shrink-0 shadow-xs">
              <CheckCircle2 className="w-6 h-6" />
            </div>
            <div>
              <div className="flex items-center gap-2">
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

      {/* ETAPA 1: BUSCA DE CORRIDA (Origem com Meu GPS e Destino com Número) */}
      {passengerStep === 'search' && (
        <div id="route-details" className="bg-white border border-slate-200 rounded-3xl p-5 sm:p-6 shadow-md space-y-4 animate-fade-in">
        {/* Banner de Erro de Validação de Número */}
        {addressValidationError && (
          <div className="bg-rose-50 border-2 border-rose-400 p-4 rounded-2xl flex items-center justify-between text-rose-950 font-bold text-xs sm:text-sm shadow-md animate-bounce">
            <div className="flex items-center gap-2.5">
              <AlertTriangle className="w-5 h-5 text-rose-600 shrink-0" />
              <span>{addressValidationError}</span>
            </div>
            <button
              type="button"
              onClick={() => setAddressValidationError(null)}
              className="text-rose-700 hover:text-rose-950 p-1 cursor-pointer font-bold text-sm"
            >
              ✕
            </button>
          </div>
        )}

        <div className="flex items-center justify-between pb-2 border-b border-slate-200">
          <div>
            <h2 className="font-heading font-black text-slate-950 text-xl sm:text-2xl flex items-center gap-2.5">
              <Navigation className="w-6 h-6 text-amber-600" />
              <span>Para onde vamos hoje?</span>
            </h2>
            <p className="text-xs sm:text-sm text-slate-600 font-medium mt-0.5">
              Informe o ponto de embarque e destino com o número exato para o trajeto em Indaiatuba
            </p>
          </div>
          <span className="text-xs sm:text-sm font-mono text-emerald-700 bg-emerald-50 px-3 py-1 rounded-full border border-emerald-200 font-extrabold shrink-0">
            {availableDrivers.filter((d) => d.status === 'online').length} condutores online
          </span>
        </div>

        {/* Pickup Input com Busca Automática & Geolocalização */}
        <div className="relative">
          {/* Barra Superior de Embarque com Botão 'Meu GPS' Acima do Endereço de Saída */}
          <div className="flex items-center justify-between mb-2">
            <label className="flex items-center gap-2 text-xs sm:text-sm font-heading font-black text-slate-900 uppercase tracking-wide">
              <span className="w-2.5 h-2.5 rounded-full bg-emerald-500 shrink-0 shadow-xs"></span>
              <span>Endereço de Saída / Embarque (Com Número)</span>
            </label>
            <button
              type="button"
              onClick={handleUseCurrentLocation}
              title="Detectar Minha Localização GPS Atual"
              disabled={isLocatingUser}
              className="px-3.5 py-1.5 bg-emerald-600 hover:bg-emerald-700 active:scale-95 text-white text-xs sm:text-sm font-black rounded-xl cursor-pointer shadow-xs flex items-center gap-1.5 transition-all disabled:opacity-60"
            >
              {isLocatingUser ? (
                <>
                  <Loader2 className="w-4 h-4 animate-spin text-white" />
                  <span>Buscando seu GPS...</span>
                </>
              ) : (
                <>
                  <Crosshair className="w-4 h-4 text-emerald-100" />
                  <span>Meu GPS</span>
                </>
              )}
            </button>
          </div>

          <div className="relative flex items-center">
            <div className="w-12 h-12 rounded-2xl bg-emerald-50 text-emerald-700 flex items-center justify-center shrink-0 border-2 border-emerald-200 shadow-xs">
              <MapPin className="w-6 h-6" />
            </div>

            <div className="relative flex-1 ml-3">
              <input
                type="text"
                value={pickupInput}
                onChange={(e) => handlePickupChange(e.target.value)}
                onFocus={() => {
                  setActiveDropdown('pickup');
                  if (!pickupSuggestions.length) setPickupSuggestions(POPULAR_DATABASE_LOCATIONS.slice(0, 4));
                }}
                placeholder="Ex: Av. Presidente Vargas, 1250 - Centro, Indaiatuba-SP"
                className={`w-full bg-white border-2 ${
                  !hasAddressNumber(pickupInput) && pickupInput.trim().length > 3
                    ? 'border-amber-400 focus:border-amber-500'
                    : 'border-slate-300 hover:border-emerald-400 focus:border-emerald-600'
                } rounded-2xl px-4 py-3.5 text-base sm:text-lg text-slate-950 placeholder-slate-400 focus:outline-none focus:ring-4 focus:ring-emerald-500/10 font-bold pr-11 shadow-xs transition-all`}
              />
              {isSearchingPickup && (
                <Loader2 className="w-5 h-5 text-emerald-600 animate-spin absolute right-3.5 top-4" />
              )}
              {pickupInput && !isSearchingPickup && (
                <button
                  type="button"
                  onClick={() => {
                    setPickupInput('');
                    setPickup(null);
                    setGpsDetectedNotice(null);
                  }}
                  className="absolute right-3.5 top-4 text-slate-400 hover:text-slate-800 cursor-pointer p-0.5"
                  title="Limpar endereço de saída"
                >
                  <X className="w-5 h-5" />
                </button>
              )}
            </div>
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
            <div className="mt-2.5 flex items-center justify-between bg-emerald-50 border-2 border-emerald-300 px-4 py-3 rounded-2xl text-xs sm:text-sm text-emerald-950 font-bold animate-fade-in shadow-xs">
              <div className="flex items-center gap-2 truncate">
                <span className="w-2.5 h-2.5 rounded-full bg-emerald-500 radar-pulse shrink-0" />
                <span className="text-emerald-800 font-black uppercase font-mono shrink-0">Saída Detectada via GPS:</span>
                <span className="text-slate-900 truncate font-extrabold">{gpsDetectedNotice}</span>
              </div>
              <button
                type="button"
                onClick={() => setGpsDetectedNotice(null)}
                className="text-emerald-700 hover:text-emerald-950 font-bold text-xs ml-2 cursor-pointer p-0.5"
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
                  className="text-emerald-700 hover:text-emerald-950 text-xs font-bold"
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
                  <div className="flex-1">
                    <span className="font-bold text-slate-900 text-sm sm:text-base block">
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
        <div className="relative">
          {/* Barra Superior do Destino */}
          <div className="flex items-center justify-between mb-2">
            <label className="flex items-center gap-2 text-xs sm:text-sm font-heading font-black text-slate-900 uppercase tracking-wide">
              <span className="w-2.5 h-2.5 rounded-full bg-amber-500 shrink-0 shadow-xs"></span>
              <span>Endereço de Chegada / Destino (Com Número)</span>
            </label>
          </div>

          <div className="relative flex items-center">
            <div className="w-12 h-12 rounded-2xl bg-amber-50 text-amber-700 flex items-center justify-center shrink-0 border-2 border-amber-200 shadow-xs">
              <Navigation className="w-6 h-6" />
            </div>

            <div className="relative flex-1 ml-3">
              <input
                type="text"
                value={destInput}
                onChange={(e) => handleDestChange(e.target.value)}
                onFocus={() => {
                  setActiveDropdown('destination');
                  if (!destSuggestions.length) setDestSuggestions(POPULAR_DATABASE_LOCATIONS.slice(0, 4));
                }}
                placeholder="Ex: Av. dos Trabalhadores, 350 - Jardim América, Indaiatuba-SP"
                className={`w-full bg-white border-2 ${
                  !hasAddressNumber(destInput) && destInput.trim().length > 3
                    ? 'border-amber-400 focus:border-amber-500'
                    : 'border-slate-300 hover:border-amber-400 focus:border-amber-500'
                } rounded-2xl px-4 py-3.5 text-base sm:text-lg text-slate-950 placeholder-slate-400 focus:outline-none focus:ring-4 focus:ring-amber-500/10 font-bold pr-11 shadow-xs transition-all`}
              />
              {isSearchingDest && (
                <Loader2 className="w-5 h-5 text-amber-600 animate-spin absolute right-3.5 top-4" />
              )}
              {destInput && !isSearchingDest && (
                <button
                  type="button"
                  onClick={() => {
                    setDestInput('');
                    setDestination(null);
                  }}
                  className="absolute right-3.5 top-4 text-slate-400 hover:text-slate-800 cursor-pointer p-0.5"
                  title="Limpar destino"
                >
                  <X className="w-5 h-5" />
                </button>
              )}
            </div>
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
        <div className="pt-1">
          <p className="text-xs text-slate-500 font-extrabold mb-2 uppercase tracking-wider flex items-center gap-1.5">
            <Search className="w-3.5 h-3.5 text-slate-400" />
            <span>Destinos Frequentes de Indaiatuba com Número</span>
          </p>
          <div className="flex gap-2.5 overflow-x-auto pb-1 scrollbar-none">
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
                className="shrink-0 bg-slate-50 hover:bg-amber-50 border border-slate-300 hover:border-amber-400 text-slate-800 hover:text-amber-900 text-xs sm:text-sm font-semibold px-3.5 py-2 rounded-xl transition-all cursor-pointer flex items-center gap-2 shadow-sm"
              >
                <Clock className="w-3.5 h-3.5 text-slate-500" />
                <span className="truncate max-w-[200px]">{loc.mainText}</span>
              </button>
            ))}
          </div>
        </div>

        {/* Botão Buscar Corrida */}
        <button
          type="button"
          onClick={handleSearchRides}
          className="w-full bg-[#ff6a00] hover:bg-[#e05e00] active:scale-[0.98] text-white font-heading font-black text-base sm:text-lg py-4 px-6 rounded-2xl shadow-xl flex items-center justify-center gap-3 border-2 border-[#ff8533] cursor-pointer transition-all uppercase tracking-wider mt-4"
        >
          <Search className="w-6 h-6 stroke-[2.5]" />
          <span>Buscar corrida</span>
        </button>

        {/* Botão DESABILITADO no início (cinza, não clicável) */}
        <div className="pt-2">
          <button
            type="button"
            disabled
            className="w-full bg-slate-100 border-2 border-slate-300 text-slate-400 font-heading font-black text-xs sm:text-sm py-3.5 px-4 rounded-2xl flex items-center justify-center gap-2 cursor-not-allowed uppercase tracking-wider shadow-none select-none"
          >
            <Lock className="w-4 h-4 text-slate-400" />
            <span>Complete endereço e pagamento para ver o mapa</span>
          </button>
        </div>
      </div>
      )}

      {/* ETAPA 2: ESCOLHA DA CATEGORIA COM VALOR FINAL */}
      {passengerStep === 'options' && (
        <div className="space-y-4 animate-fade-in">
          {/* Card Resumo do Trajeto com Botão Alterar Endereços */}
          <div className="bg-white border border-slate-200 rounded-3xl p-4 sm:p-5 shadow-sm flex flex-col sm:flex-row sm:items-center justify-between gap-3">
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
          <div className="w-full">
            {isRideMapAllowed ? (
              onOpenFullMap && (
                <button
                  type="button"
                  onClick={onOpenFullMap}
                  className="w-full bg-[#ff6a00] hover:bg-[#e05e00] active:scale-[0.98] text-white font-heading font-black text-base sm:text-lg py-4 px-6 rounded-2xl shadow-xl flex items-center justify-center gap-3 border-2 border-[#ff8533] cursor-pointer transition-all uppercase tracking-wider animate-fade-in"
                >
                  <Maximize2 className="w-6 h-6 stroke-[2.5]" />
                  <span>VER O MAPA TELA INTEIRA</span>
                </button>
              )
            ) : (
              <div className="space-y-2">
                <button
                  type="button"
                  disabled
                  className="w-full bg-slate-100 border-2 border-slate-300 text-slate-400 font-heading font-black text-xs sm:text-sm py-4 px-6 rounded-2xl flex items-center justify-center gap-2.5 cursor-not-allowed shadow-none select-none uppercase tracking-wider"
                >
                  <Lock className="w-5 h-5 text-slate-400" />
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
          <div className="space-y-3">
            <div className="flex items-center justify-between">
              <label className="text-sm font-heading font-black text-slate-950 uppercase tracking-wider">
                Escolha sua Categoria de Viagem
              </label>
              <span className="text-xs text-slate-600 font-mono font-bold bg-slate-100 px-3 py-1 rounded-full border border-slate-200">
                Distância da rota: {dynamicDistanceKm} km
              </span>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3.5">
              {/* 1. Motorista Econômico */}
              {(() => {
                const cat = VEHICLE_CATEGORIES.economica;
                const fare = calculateFare('economica', dynamicDistanceKm);
                return (
                  <div
                    onClick={() => handleSelectCategory('economica')}
                    className="p-5 rounded-2xl border-2 border-slate-200 hover:border-amber-500 bg-white transition-all cursor-pointer flex flex-col justify-between shadow-md hover:shadow-lg group"
                  >
                    <div>
                      <div className="flex items-start justify-between">
                        <div className="flex items-center gap-3.5">
                          <div className="w-13 h-13 rounded-2xl bg-amber-100 text-amber-800 flex items-center justify-center shrink-0 border border-amber-300">
                            <Car className="w-7 h-7" />
                          </div>
                          <div>
                            <div className="flex items-center gap-2">
                              <span className="font-heading font-black text-slate-950 text-base sm:text-lg">
                                Motorista Econômico
                              </span>
                              <span className="bg-emerald-100 text-emerald-800 font-bold text-[11px] px-2 py-0.5 rounded-full border border-emerald-300 font-mono">
                                Mais Pedida
                              </span>
                            </div>
                            <p className="text-xs sm:text-sm text-slate-600 font-medium leading-tight mt-1">
                              {cat.capacity} &bull; {cat.estimatedTimeMin} min de espera
                            </p>
                          </div>
                        </div>

                        <div className="text-right">
                          <span className="font-heading font-black text-slate-950 text-2xl sm:text-3xl text-amber-600">
                            {formatBRL(fare.totalPrice)}
                          </span>
                          <p className="text-xs text-slate-500 font-bold uppercase font-mono">Preço Final</p>
                        </div>
                      </div>

                      <div className="mt-3 text-xs text-slate-600 border-t border-slate-100 pt-2 flex items-center justify-between font-medium">
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
                      className="w-full mt-4 py-3.5 px-4 rounded-xl font-heading font-black text-sm flex items-center justify-center gap-2 transition-all shadow-md active:scale-95 cursor-pointer bg-amber-500 hover:bg-amber-400 text-slate-950 border border-amber-400 uppercase tracking-wide"
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
                    className="p-5 rounded-2xl border-2 border-purple-200 hover:border-purple-500 bg-white transition-all cursor-pointer flex flex-col justify-between shadow-md hover:shadow-lg group"
                  >
                    <div>
                      <div className="flex items-start justify-between">
                        <div className="flex items-center gap-3.5">
                          <div className="w-13 h-13 rounded-2xl bg-purple-100 text-purple-800 flex items-center justify-center shrink-0 border border-purple-300">
                            <Sparkles className="w-7 h-7" />
                          </div>
                          <div>
                            <div className="flex items-center gap-2">
                              <span className="font-heading font-black text-slate-950 text-base sm:text-lg">
                                Motorista Confort
                              </span>
                              <span className="bg-purple-100 text-purple-900 font-bold text-[11px] px-2 py-0.5 rounded-full border border-purple-300 font-mono">
                                Mais Conforto
                              </span>
                            </div>
                            <p className="text-xs sm:text-sm text-slate-600 font-medium leading-tight mt-1">
                              Sedans e SUVs novos &bull; {cat.estimatedTimeMin} min
                            </p>
                          </div>
                        </div>

                        <div className="text-right">
                          <span className="font-heading font-black text-purple-900 text-2xl sm:text-3xl">
                            {formatBRL(fare.totalPrice)}
                          </span>
                          <p className="text-xs text-purple-600 font-bold uppercase font-mono">Preço Final</p>
                        </div>
                      </div>

                      <div className="mt-3 text-xs text-slate-600 border-t border-slate-100 pt-2 flex items-center justify-between font-medium">
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
                      className="w-full mt-4 py-3.5 px-4 rounded-xl font-heading font-black text-sm flex items-center justify-center gap-2 transition-all shadow-md active:scale-95 cursor-pointer bg-purple-700 hover:bg-purple-600 text-white border border-purple-600 uppercase tracking-wide"
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
                    className="p-5 rounded-2xl border-2 border-cyan-200 hover:border-cyan-500 bg-white transition-all cursor-pointer flex flex-col justify-between shadow-md hover:shadow-lg group"
                  >
                    <div>
                      <div className="flex items-start justify-between">
                        <div className="flex items-center gap-3.5">
                          <div className="w-13 h-13 rounded-2xl bg-cyan-100 text-cyan-800 flex items-center justify-center shrink-0 border border-cyan-300">
                            <Bike className="w-7 h-7" />
                          </div>
                          <div>
                            <div className="flex items-center gap-2">
                              <span className="font-heading font-black text-slate-950 text-base sm:text-lg">
                                Motoboy Passageiro
                              </span>
                              <span className="bg-cyan-100 text-cyan-900 font-bold text-[11px] px-2 py-0.5 rounded-full border border-cyan-300 font-mono">
                                Mais Rápido
                              </span>
                            </div>
                            <p className="text-xs sm:text-sm text-slate-600 font-medium leading-tight mt-1">
                              Rápido no trânsito &bull; {cat.estimatedTimeMin} min
                            </p>
                          </div>
                        </div>

                        <div className="text-right">
                          <span className="font-heading font-black text-cyan-900 text-2xl sm:text-3xl">
                            {formatBRL(fare.totalPrice)}
                          </span>
                          <p className="text-xs text-cyan-600 font-bold uppercase font-mono">Preço Final</p>
                        </div>
                      </div>

                      <div className="mt-3 text-xs text-slate-600 border-t border-slate-100 pt-2 flex items-center justify-between font-medium">
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
                      className="w-full mt-4 py-3.5 px-4 rounded-xl font-heading font-black text-sm flex items-center justify-center gap-2 transition-all shadow-md active:scale-95 cursor-pointer bg-cyan-600 hover:bg-cyan-500 text-white border border-cyan-500 uppercase tracking-wide"
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
                    className="p-5 rounded-2xl border-2 border-amber-200 hover:border-amber-500 bg-white transition-all cursor-pointer flex flex-col justify-between shadow-md hover:shadow-lg group"
                  >
                    <div>
                      <div className="flex items-start justify-between">
                        <div className="flex items-center gap-3.5">
                          <div className="w-13 h-13 rounded-2xl bg-amber-100 text-amber-800 flex items-center justify-center shrink-0 border border-amber-300">
                            <PackageCheck className="w-7 h-7" />
                          </div>
                          <div>
                            <div className="flex items-center gap-2">
                              <span className="font-heading font-black text-slate-950 text-base sm:text-lg">
                                Motoboy Entregas
                              </span>
                              <span className="bg-amber-100 text-amber-900 font-bold text-[11px] px-2 py-0.5 rounded-full border border-amber-300 font-mono">
                                Flash Delivery
                              </span>
                            </div>
                            <p className="text-xs sm:text-sm text-slate-600 font-medium leading-tight mt-1">
                              Delivery & Encomendas &bull; {cat.estimatedTimeMin} min
                            </p>
                          </div>
                        </div>

                        <div className="text-right">
                          <span className="font-heading font-black text-slate-950 text-2xl sm:text-3xl text-amber-600">
                            {formatBRL(fare.totalPrice)}
                          </span>
                          <p className="text-xs text-slate-500 font-bold uppercase font-mono">Preço Final</p>
                        </div>
                      </div>

                      <div className="mt-3 text-xs text-slate-600 border-t border-slate-100 pt-2 flex items-center justify-between font-medium">
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
                      className="w-full mt-4 py-3.5 px-4 rounded-xl font-heading font-black text-sm flex items-center justify-center gap-2 transition-all shadow-md active:scale-95 cursor-pointer bg-gradient-to-r from-amber-500 via-amber-400 to-amber-500 hover:brightness-105 text-slate-950 border border-amber-400 uppercase tracking-wide"
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
      {passengerStep === 'payment' && (() => {
        const fare = calculateFare(selectedCategory, dynamicDistanceKm);
        const isMoto = selectedCategory === 'moto_passageiro' || selectedCategory === 'moto_entrega';
        // Código PIX completo retornado pelo Asaas (sem nenhum corte por slice ou substring)
        const pixPayloadCompleto = (
          asaasPayment?.pixQrCode?.payload ||
          (asaasPayment?.pixQrCode as any)?.pixCopyPaste ||
          generateFallbackPixCopiaECola(fare.totalPrice, `RACE${Math.round(fare.totalPrice * 100)}`)
        ).trim();

        return (
          <div className="space-y-4 animate-fade-in">
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
            <div className="bg-gradient-to-br from-amber-500/10 via-orange-500/10 to-amber-500/10 border-2 border-[#ff6a00] rounded-3xl p-5 sm:p-6 shadow-md space-y-4">
              <div className="flex items-start justify-between gap-3 border-b border-orange-200/80 pb-3">
                <div>
                  <span className="text-[11px] font-bold text-slate-500 uppercase tracking-wider block font-mono">
                    Resumo do Pedido de Corrida
                  </span>
                  <h3 className="text-xl sm:text-2xl font-heading font-black text-slate-950 mt-1">
                    Você escolheu {getCategoryDisplayName(selectedCategory)} - {formatBRL(fare.totalPrice)}
                  </h3>
                </div>
                <div className="w-12 h-12 rounded-2xl bg-[#ff6a00] text-white flex items-center justify-center font-bold shrink-0 shadow-md">
                  {isMoto ? <Bike className="w-6 h-6" /> : <Car className="w-6 h-6" />}
                </div>
              </div>

              {/* Rota */}
              <div className="space-y-2 text-xs sm:text-sm text-slate-800 bg-white/80 rounded-2xl p-4 border border-orange-200">
                <div className="flex items-start gap-2.5">
                  <MapPin className="w-4 h-4 text-emerald-600 shrink-0 mt-0.5" />
                  <div>
                    <span className="text-[10px] font-bold text-emerald-700 uppercase block font-mono">Embarque</span>
                    <span className="font-bold text-slate-950">{pickupInput}</span>
                  </div>
                </div>
                <div className="flex items-start gap-2.5 pt-2 border-t border-slate-100">
                  <Navigation className="w-4 h-4 text-amber-600 shrink-0 mt-0.5" />
                  <div>
                    <span className="text-[10px] font-bold text-amber-700 uppercase block font-mono">Destino</span>
                    <span className="font-bold text-slate-950">{destInput}</span>
                  </div>
                </div>
                <div className="pt-2 border-t border-slate-100 flex items-center justify-between text-xs text-slate-600 font-mono">
                  <span>Distância da Rota:</span>
                  <span className="font-black text-[#ff6a00]">{dynamicDistanceKm} km</span>
                </div>
              </div>
            </div>

            {/* Formas de Pagamento no App (PIX no app / Cartão no app) */}
            <div className="bg-white border border-slate-200 rounded-3xl p-5 sm:p-6 shadow-md space-y-4">
              <div className="flex items-center justify-between pb-3 border-b border-slate-200">
                <div className="flex items-center gap-2">
                  <Lock className="w-5 h-5 text-emerald-600" />
                  <h4 className="font-heading font-black text-slate-950 text-base uppercase tracking-wider">
                    Forma de Pagamento no App
                  </h4>
                </div>
                <span className="text-xs font-bold text-emerald-700 bg-emerald-50 px-2.5 py-1 rounded-full border border-emerald-200 font-mono">
                  100% SEGURO
                </span>
              </div>

              <div className="grid grid-cols-3 gap-2.5 sm:gap-3">
                <button
                  type="button"
                  onClick={() => {
                    setPaymentMethod('pix');
                    initAsaasPayment('pix', selectedCategory);
                  }}
                  className={`p-3 sm:p-4 rounded-2xl border-2 flex flex-col items-center justify-center gap-1.5 transition-all cursor-pointer ${
                    paymentMethod === 'pix'
                      ? 'bg-emerald-50 border-emerald-500 text-emerald-950 font-black shadow-sm ring-2 ring-emerald-500/20'
                      : 'bg-slate-50 border-slate-200 text-slate-700 hover:bg-white'
                  }`}
                >
                  <QrCode className="w-6 h-6 text-emerald-600" />
                  <span className="text-xs sm:text-sm font-black">PIX no app</span>
                  <span className="text-[10px] sm:text-xs text-emerald-700 font-bold">Asaas Instantâneo</span>
                </button>

                <button
                  type="button"
                  onClick={() => {
                    setPaymentMethod('credit_card');
                    initAsaasPayment('credit_card', selectedCategory);
                  }}
                  className={`p-3 sm:p-4 rounded-2xl border-2 flex flex-col items-center justify-center gap-1.5 transition-all cursor-pointer ${
                    paymentMethod === 'credit_card'
                      ? 'bg-amber-50 border-amber-500 text-amber-950 font-black shadow-sm ring-2 ring-amber-500/20'
                      : 'bg-slate-50 border-slate-200 text-slate-700 hover:bg-white'
                  }`}
                >
                  <CreditCard className="w-6 h-6 text-amber-600" />
                  <span className="text-xs sm:text-sm font-black">Cartão no app</span>
                  <span className="text-[10px] sm:text-xs text-amber-700 font-bold">Link Seguro Asaas</span>
                </button>

                <button
                  type="button"
                  onClick={() => {
                    if (pollingTimerRef.current) clearInterval(pollingTimerRef.current);
                    setIsPollingAsaas(false);
                    setPaymentMethod('dinheiro');
                  }}
                  className={`p-3 sm:p-4 rounded-2xl border-2 flex flex-col items-center justify-center gap-1.5 transition-all cursor-pointer ${
                    isCashMethod(paymentMethod)
                      ? 'bg-blue-50 border-blue-500 text-blue-950 font-black shadow-sm ring-2 ring-blue-500/20'
                      : 'bg-slate-50 border-slate-200 text-slate-700 hover:bg-white'
                  }`}
                >
                  <Wallet className="w-6 h-6 text-blue-600" />
                  <span className="text-xs sm:text-sm font-black">Dinheiro</span>
                  <span className="text-[10px] sm:text-xs text-blue-700 font-bold">Ao condutor</span>
                </button>
              </div>

              {/* FLUXO PIX NO APP VIA ASAAS */}
              {paymentMethod === 'pix' && (
                <div className="space-y-4 pt-2">
                  <div className="bg-slate-50 border border-slate-200 rounded-3xl p-5 text-center space-y-4">
                    <div className="flex items-center justify-between border-b border-slate-200 pb-3">
                      <div className="text-left">
                        <span className="text-[10px] font-mono font-bold text-slate-500 uppercase block">Gateway de Pagamento</span>
                        <span className="font-heading font-black text-slate-900 text-sm flex items-center gap-1.5">
                          <CheckCircle2 className="w-4 h-4 text-emerald-600" /> PIX Asaas Integrado
                        </span>
                      </div>
                      <span className="text-xs font-mono font-bold text-emerald-700 bg-emerald-100 px-2.5 py-1 rounded-full border border-emerald-300">
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
                              className="w-56 h-56 sm:w-64 sm:h-64 mx-auto rounded-2xl border-2 border-emerald-500 shadow-md p-2 bg-white object-contain"
                            />
                          ) : (
                            <div className="w-56 h-56 mx-auto bg-white p-3 border-2 border-emerald-500 rounded-2xl shadow-inner flex items-center justify-center">
                              <QrCode className="w-36 h-36 text-slate-900" />
                            </div>
                          )}
                          <p className="text-xs text-slate-500 mt-2 font-medium">
                            Escaneie com o app do seu banco ou copie o código abaixo
                          </p>
                        </div>

                        {/* Código PIX Copia e Cola Completo do Asaas */}
                        <div className="space-y-3 text-left bg-white p-4 sm:p-5 rounded-2xl border-2 border-emerald-500 shadow-sm">
                          <div className="flex items-center justify-between">
                            <label className="text-xs font-heading font-black text-slate-900 uppercase flex items-center gap-1.5">
                              <Copy className="w-4 h-4 text-emerald-600" />
                              <span>PIX Copia e Cola Completo ({formatBRL(fare.totalPrice)})</span>
                            </label>
                            <span className="text-[10px] font-mono font-bold text-emerald-800 bg-emerald-100 px-2 py-0.5 rounded-full border border-emerald-300">
                              {pixPayloadCompleto.length} CARACTERES
                            </span>
                          </div>

                          <p className="text-xs text-slate-600">
                            Copie o código completo abaixo e cole no seu banco (opção <strong>PIX Copia e Cola</strong>):
                          </p>

                          {/* Caixa com scroll horizontal visível para o passageiro ver o código inteiro */}
                          <div className="w-full bg-slate-50 border-2 border-slate-300 rounded-xl p-3 overflow-x-auto whitespace-nowrap scrollbar-thin scrollbar-thumb-emerald-500">
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

                          {/* Mensagem de sucesso quando copiado */}
                          {pixCopied && (
                            <div className="p-2.5 bg-emerald-50 border border-emerald-400 rounded-xl text-center text-xs font-bold text-emerald-950 animate-fade-in flex items-center justify-center gap-2">
                              <CheckCircle2 className="w-4 h-4 text-emerald-600 shrink-0" />
                              <span>Código PIX copiado! Cole no seu banco para pagar {formatBRL(fare.totalPrice)}.</span>
                            </div>
                          )}
                        </div>

                        {/* Status de aguardo em tempo real */}
                        <div className="p-3 bg-emerald-50 border border-emerald-200 rounded-2xl flex items-center justify-center gap-2 text-xs font-bold text-emerald-900">
                          <Loader2 className="w-4 h-4 animate-spin text-emerald-600 shrink-0" />
                          <span>Aguardando confirmação do Asaas em tempo real...</span>
                        </div>

                        {/* Botão de confirmação manual ou direto para o mapa */}
                        <button
                          type="button"
                          onClick={handlePayInAppAction}
                          disabled={isProcessingPayment}
                          className="w-full bg-[#ff6a00] hover:bg-[#e05e00] active:scale-[0.98] text-white font-heading font-black text-base sm:text-lg py-4 px-6 rounded-2xl shadow-xl flex items-center justify-center gap-3 border-2 border-[#ff8533] cursor-pointer transition-all uppercase tracking-wider disabled:opacity-75"
                        >
                          {isProcessingPayment ? (
                            <>
                              <Loader2 className="w-6 h-6 animate-spin text-white" />
                              <span>Confirmando com Asaas...</span>
                            </>
                          ) : (
                            <>
                              <CheckCircle2 className="w-6 h-6 text-white stroke-[2.5]" />
                              <span>Já fiz o PIX no banco (Ver Mapa)</span>
                            </>
                          )}
                        </button>
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
                          <CreditCard className="w-4 h-4 text-amber-600" /> Link de Pagamento Asaas
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

                    {/* Formulário de Cartão no próprio App */}
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
                    </div>

                    <button
                      type="button"
                      onClick={handlePayInAppAction}
                      disabled={isProcessingPayment}
                      className="w-full bg-[#ff6a00] hover:bg-[#e05e00] active:scale-[0.98] text-white font-heading font-black text-base sm:text-lg py-4 px-6 rounded-2xl shadow-xl flex items-center justify-center gap-3 border-2 border-[#ff8533] cursor-pointer transition-all uppercase tracking-wider disabled:opacity-75"
                    >
                      {isProcessingPayment ? (
                        <>
                          <Loader2 className="w-6 h-6 animate-spin text-white" />
                          <span>Processando Cartão com Asaas...</span>
                        </>
                      ) : (
                        <>
                          <Lock className="w-5 h-5 text-white" />
                          <span>Pagar {formatBRL(fare.totalPrice)} com Cartão</span>
                        </>
                      )}
                    </button>
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

                    <p className="text-xs sm:text-sm text-slate-700 font-medium">
                      Pague <strong className="text-slate-950">{formatBRL(fare.totalPrice)}</strong> diretamente ao motorista/motoboy no final da corrida. Ao confirmar abaixo, sua corrida é criada na hora sem passar pelo Asaas e abre o mapa procurando motorista.
                    </p>

                    <button
                      type="button"
                      onClick={handleConfirmMoneyRide}
                      className="w-full bg-[#ff6a00] hover:bg-[#e05e00] active:scale-[0.98] text-white font-heading font-black text-base sm:text-lg py-4 px-6 rounded-2xl shadow-xl flex items-center justify-center gap-3 border-2 border-[#ff8533] cursor-pointer transition-all uppercase tracking-wider"
                    >
                      <CheckCircle2 className="w-6 h-6 text-white stroke-[2.5]" />
                      <span>Confirmar Dinheiro {formatBRL(fare.totalPrice)} (Ver Mapa)</span>
                    </button>
                  </div>
                </div>
              )}
            </div>
          </div>
        );
      })()}

      {/* Safety & 100% Policy Guarantee Banner */}
      <div className="bg-slate-50 border border-slate-200 rounded-2xl p-4 flex items-center justify-between text-xs sm:text-sm text-slate-700 shadow-sm font-medium">
        <div className="flex items-center gap-2.5">
          <ShieldCheck className="w-5 h-5 text-amber-600" />
          <span>Motoristas verificados com CNH, antecedentes criminais e telemetria 24h</span>
        </div>
        <span className="font-mono text-amber-700 font-extrabold bg-amber-50 px-2.5 py-1 rounded-md border border-amber-200">
          RACE 24H
        </span>
      </div>
    </div>
  );
};
