import React, { useState, useEffect, useRef } from 'react';
import { 
  AppUser,
  Driver, 
  LocationPoint, 
  Ride, 
  VehicleCategory 
} from '../types';
import { VEHICLE_CATEGORIES, calculateFare, formatBRL } from '../services/pricingService';
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
  Route
} from 'lucide-react';
import confetti from 'canvas-confetti';

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
  const [paymentMethod, setPaymentMethod] = useState<'pix' | 'credit_card' | 'race_pay'>('pix');
  const [pickupInput, setPickupInput] = useState(
    pickup?.address || 'Av. Presidente Vargas, 1250 - Centro, Indaiatuba-SP'
  );
  const [destInput, setDestInput] = useState(
    destination?.address || 'Av. dos Trabalhadores, 350 - Jardim América, Indaiatuba-SP'
  );

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
  const [ratingCompliments, setRatingCompliments] = useState<string[]>(['Direção Segura', 'Carro Limpo']);

  const searchTimeoutRef = useRef<any>(null);

  // Calculate actual dynamic distance between points
  const dynamicDistanceKm = pickup && destination
    ? calculateDistanceKm(pickup.lat, pickup.lng, destination.lat, destination.lng)
    : 3.8;

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
      { timeout: 7000, enableHighAccuracy: true }
    );
  };

  const handleRequestRideWithCategory = (catId?: VehicleCategory) => {
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

    // Find a matching driver or use first available
    const matchedDriver = availableDrivers.find(
      (d) => d.category === finalCategory && d.status === 'online'
    ) || availableDrivers[0];

    const newRide: Ride = {
      id: `RCE-${Math.floor(1000 + Math.random() * 9000)}`,
      passengerName: 'Você (Passageiro RACE)',
      passengerPhone: '(19) 99887-1122',
      passengerRating: 5.0,
      driver: matchedDriver,
      category: finalCategory,
      pickup: finalPickup,
      destination: finalDest,
      distanceKm: dynamicDistanceKm,
      durationMinutes: Math.round(dynamicDistanceKm * 2.2),
      price: calculated.totalPrice,
      driverEarnings: calculated.driverEarnings, // 100% repassado!
      platformFee: 0.00,
      paymentMethod,
      paymentStatus: 'paid',
      status: 'driver_assigned',
      createdAt: new Date().toISOString(),
    };

    onStartRide(newRide);
    try {
      confetti({
        particleCount: 50,
        spread: 60,
        origin: { y: 0.7 },
      });
    } catch {
      // safe fallback
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

  // If a ride is active, show the Map Hero with overlays on top of the map
  if (activeRide) {
    const isCompleted = activeRide.status === 'completed';

    return (
      <div className="space-y-4">
        {/* Active Ride HUD card in clean white */}
        <div className="bg-white border-2 border-amber-400 rounded-3xl p-5 sm:p-6 shadow-xl space-y-4">
          {/* Status Header */}
          <div className="flex items-center justify-between border-b border-slate-200 pb-4">
            <div className="flex items-center gap-3">
              <span className="w-3.5 h-3.5 rounded-full bg-emerald-500 radar-pulse" />
              <div>
                <h3 className="font-heading font-black text-slate-950 text-lg sm:text-xl">
                  {activeRide.status === 'driver_assigned' && 'Motorista a Caminho'}
                  {activeRide.status === 'driver_arriving' && 'Motorista Chegando no Embarque'}
                  {activeRide.status === 'in_progress' && 'Viagem em Andamento'}
                  {activeRide.status === 'completed' && 'Viagem Concluída com Sucesso!'}
                </h3>
                <p className="text-xs sm:text-sm text-slate-600 font-mono font-bold">
                  Corrida #{activeRide.id} • Rastreamento Seguro 24h
                </p>
              </div>
            </div>

            <div className="text-right">
              <div className="text-2xl sm:text-3xl font-heading font-black text-slate-950">
                {formatBRL(activeRide.price)}
              </div>
              <div className="text-xs text-emerald-700 font-bold bg-emerald-50 px-2 py-0.5 rounded-full border border-emerald-200">
                100% ao Condutor
              </div>
            </div>
          </div>

          {/* Botão de Destaque: Ver Mapa em Tela Cheia Sem Informações em Cima */}
          {onOpenFullMap && (
            <button
              type="button"
              onClick={onOpenFullMap}
              className="w-full bg-[#ff6a00] hover:bg-[#e05e00] active:scale-95 text-white font-heading font-black py-3.5 px-4 rounded-2xl shadow-lg flex items-center justify-center gap-2.5 transition-all cursor-pointer border border-[#ff8533] text-sm sm:text-base uppercase tracking-wider"
            >
              <Maximize2 className="w-5 h-5" />
              <span>Ver Mapa em Tela Cheia (100% da Tela)</span>
            </button>
          )}

          {/* Driver & Vehicle Details */}
          {activeRide.driver && (
            <div className="bg-slate-50 rounded-2xl p-4 border border-slate-200 flex items-center justify-between gap-4 shadow-sm">
              <div className="flex items-center gap-3.5">
                <div className="relative">
                  <img
                    src={activeRide.driver.avatar}
                    alt={activeRide.driver.name}
                    className="w-14 h-14 rounded-full object-cover border-2 border-amber-500 shadow-md"
                  />
                  <span className="absolute -bottom-1 -right-1 bg-white text-slate-900 border border-slate-300 text-xs px-1.5 py-0.2 rounded-full font-bold flex items-center shadow">
                    ★ {activeRide.driver.rating.toFixed(2)}
                  </span>
                </div>
                <div>
                  <h4 className="font-heading font-bold text-slate-900 text-base sm:text-lg">
                    {activeRide.driver.name}
                  </h4>
                  <p className="text-sm text-amber-700 font-mono font-bold">
                    {activeRide.driver.vehicleModel}
                  </p>
                  <p className="text-xs sm:text-sm text-slate-600 font-mono mt-0.5">
                    Placa: <span className="bg-white text-slate-950 px-2 py-0.5 rounded border border-slate-300 font-extrabold">{activeRide.driver.vehiclePlate}</span>
                  </p>
                </div>
              </div>

              <div className="flex items-center gap-2">
                <a
                  href={`tel:${activeRide.driver.phone}`}
                  className="w-12 h-12 rounded-2xl bg-emerald-50 hover:bg-emerald-100 border border-emerald-300 text-emerald-700 flex items-center justify-center transition-all shadow cursor-pointer active:scale-95"
                  title="Ligar para o condutor"
                >
                  <Phone className="w-5 h-5" />
                </a>
              </div>
            </div>
          )}

          {/* Ações da corrida */}
          {!isCompleted && (
            <div className="flex items-center gap-3 pt-2 border-t border-slate-200">
              <button
                type="button"
                onClick={onCompleteRide}
                className="flex-1 bg-emerald-600 hover:bg-emerald-500 active:scale-95 text-white font-heading font-extrabold text-sm sm:text-base py-3.5 px-4 rounded-xl shadow-md flex items-center justify-center gap-2 cursor-pointer transition-all"
              >
                <CheckCircle2 className="w-5 h-5" />
                <span>Simular Conclusão da Corrida</span>
              </button>
              <button
                type="button"
                onClick={onCancelRide}
                className="px-5 py-3.5 rounded-xl bg-slate-100 hover:bg-slate-200 text-rose-600 text-sm font-bold border border-slate-300 transition-all cursor-pointer"
              >
                Cancelar
              </button>
            </div>
          )}
        </div>

        {/* Informações detalhadas da rota abaixo do mapa */}
        <div className="bg-white border border-slate-200 rounded-3xl p-5 shadow-md space-y-4">
          <div className="bg-emerald-50 border-2 border-emerald-300 rounded-2xl p-3 text-xs text-emerald-950 font-bold flex items-center gap-2.5">
            <CheckCircle2 className="w-4 h-4 text-emerald-600 shrink-0" />
            <span>Total repassado integralmente ao motorista (100%) - Race cobra apenas R$200 por semana</span>
          </div>

          <div className="space-y-3 text-xs sm:text-sm">
            <div className="flex items-start gap-3">
              <div className="w-6 h-6 rounded-full bg-emerald-100 text-emerald-700 flex items-center justify-center shrink-0 mt-0.5 font-black text-xs">
                A
              </div>
              <div className="flex-1">
                <span className="text-emerald-800 text-[11px] uppercase font-black block font-mono">
                  Endereço de Saída da Localização (GPS)
                </span>
                <p className="text-slate-900 font-bold">{activeRide.pickup.address}</p>
              </div>
            </div>

            <div className="flex items-start gap-3">
              <div className="w-6 h-6 rounded-full bg-amber-100 text-amber-700 flex items-center justify-center shrink-0 mt-0.5 font-black text-xs">
                B
              </div>
              <div className="flex-1">
                <span className="text-amber-800 text-[11px] uppercase font-black block font-mono">
                  Endereço de Chegada / Destino
                </span>
                <p className="text-slate-900 font-bold">{activeRide.destination.address}</p>
              </div>
            </div>
          </div>

          {/* Rating Section if completed */}
          {isCompleted && (
            <div className="bg-slate-50 p-5 rounded-2xl border border-amber-300 space-y-4 mt-4">
              <div className="text-center">
                <h4 className="font-heading font-bold text-slate-900 text-lg">
                  Como foi sua experiência com {activeRide.driver?.name}?
                </h4>
                <p className="text-sm text-slate-600">
                  Sua avaliação garante a segurança e qualidade máxima da plataforma RACE.
                </p>
              </div>

              {/* Stars */}
              <div className="flex justify-center gap-2.5 py-2">
                {[1, 2, 3, 4, 5].map((star) => (
                  <button
                    key={star}
                    type="button"
                    onClick={() => setRatingVal(star)}
                    className="p-1 cursor-pointer transition-transform hover:scale-125"
                  >
                    <Star
                      className={`w-8 h-8 ${
                        star <= ratingVal
                          ? 'fill-amber-400 text-amber-500'
                          : 'text-slate-300'
                      }`}
                    />
                  </button>
                ))}
              </div>

              {/* Quick compliments */}
              <div className="flex flex-wrap gap-2 justify-center">
                {['Direção Segura', 'Carro Limpo', 'Ar Gelado', 'Pontual', 'Excelente Conversa', 'Capacete Novo'].map(
                  (tag) => {
                    const isSelected = ratingCompliments.includes(tag);
                    return (
                      <button
                        key={tag}
                        type="button"
                        onClick={() => handleToggleCompliment(tag)}
                        className={`text-xs sm:text-sm px-3 py-1.5 rounded-full border transition-all cursor-pointer ${
                          isSelected
                            ? 'bg-amber-100 border-amber-400 text-amber-900 font-bold'
                            : 'bg-white border-slate-300 text-slate-700'
                        }`}
                      >
                        {tag}
                      </button>
                    );
                  }
                )}
              </div>

              <textarea
                value={ratingComment}
                onChange={(e) => setRatingComment(e.target.value)}
                placeholder="Deixe um comentário para o motorista (opcional)..."
                rows={2}
                className="w-full bg-white border border-slate-300 rounded-xl p-3 text-sm text-slate-900 placeholder-slate-400 focus:outline-none focus:border-amber-500"
              />

              <button
                type="button"
                onClick={handleFinishRating}
                className="w-full bg-amber-500 hover:bg-amber-400 text-slate-950 font-heading font-black py-3.5 rounded-xl transition-all shadow-md active:scale-95 cursor-pointer text-sm sm:text-base"
              >
                Enviar Avaliação e Fechar
              </button>
            </div>
          )}
        </div>
      </div>
    );
  }

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

      {/* 2. Painel "Aguardando Corridas" quando o usuário logado for Motorista ou Motoboy */}
      {(currentUser?.role === 'driver' ||
        currentUser?.role === 'motoboy' ||
        currentUser?.tipo === 'driver' ||
        currentUser?.tipo === 'motoboy' ||
        currentUser?.tipo === 'motorista_economico' ||
        currentUser?.tipo === 'motorista_confort' ||
        currentUser?.tipo === 'motoboy_passageiro' ||
        currentUser?.tipo === 'motoboy_entregas') && (
        <div className="bg-slate-950 text-white border-2 border-[#ff6a00] rounded-3xl p-5 sm:p-6 shadow-xl space-y-4 animate-fade-in">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 border-b border-zinc-800 pb-3">
            <div className="flex items-center gap-3">
              <div className="w-12 h-12 rounded-2xl bg-[#ff6a00]/20 border border-[#ff6a00]/50 text-[#ff6a00] flex items-center justify-center shrink-0">
                {currentUser?.role === 'motoboy' || 
                 currentUser?.tipo === 'motoboy' ||
                 currentUser?.tipo === 'motoboy_passageiro' ||
                 currentUser?.tipo === 'motoboy_entregas' ? (
                  <Bike className="w-6 h-6" />
                ) : (
                  <Car className="w-6 h-6" />
                )}
              </div>
              <div>
                <div className="flex items-center gap-2">
                  <h3 className="font-heading font-black text-white text-lg sm:text-xl">
                    Aguardando Corridas & Chamados
                  </h3>
                  <span className="text-xs px-2.5 py-0.5 rounded-full font-bold bg-[#ff6a00] text-black uppercase font-mono">
                    {currentUser?.tipo === 'motorista_economico'
                      ? 'Econômico'
                      : currentUser?.tipo === 'motorista_confort'
                      ? 'Confort'
                      : currentUser?.tipo === 'motoboy_passageiro'
                      ? 'Moto Táxi'
                      : currentUser?.tipo === 'motoboy_entregas'
                      ? 'Entregas Flash'
                      : currentUser?.role === 'motoboy' || currentUser?.tipo === 'motoboy'
                      ? 'Motoboy'
                      : 'Motorista'}
                  </span>
                </div>
                <p className="text-xs sm:text-sm text-zinc-300 font-medium">
                  {currentUser?.name} &bull; Categoria Oficial Cadastrada &bull; 100% dos Ganhos Livres
                </p>
              </div>
            </div>

            <div className="flex items-center gap-2">
              <span className="relative flex h-3 w-3">
                <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-emerald-400 opacity-75"></span>
                <span className="relative inline-flex rounded-full h-3 w-3 bg-emerald-500"></span>
              </span>
              <span className="text-xs sm:text-sm font-bold text-emerald-400">
                Radar Ativo no Mapa
              </span>
            </div>
          </div>

          {/* Aviso da Assinatura R$ 200/semana */}
          <div className="bg-[#141414] border border-amber-500/40 rounded-2xl p-3.5 flex flex-col sm:flex-row sm:items-center justify-between gap-3 text-xs">
            <div className="space-y-1">
              <div className="flex items-center gap-2">
                <span className="font-bold text-amber-400 text-sm">
                  Plano Semanal: R$ 200 / semana
                </span>
                <span className="bg-amber-400/20 text-amber-300 text-[10px] px-2 py-0.5 rounded-full font-mono font-bold">
                  CHAVE PIX
                </span>
              </div>
              <p className="text-zinc-300 font-mono select-all text-xs">
                Chave PIX:{' '}
                <span className="text-[#ff6a00] font-black font-mono">
                  9d9e5635-9e68-46bf-bffe-08bdae29c8ba
                </span>
              </p>
            </div>
          </div>
        </div>
      )}

      {/* Route Selector Input Box with Automatic Search */}
      <div id="route-details" className="bg-white border border-slate-200 rounded-3xl p-5 sm:p-6 shadow-md space-y-4">
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
                <Loader2 className="w-4 h-4 animate-spin text-white" />
              ) : (
                <Crosshair className="w-4 h-4 text-emerald-100" />
              )}
              <span>Meu GPS</span>
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
      </div>

      {/* MINI-MAPA COMPACTO (180px de altura) com botão para abrir tela cheia */}
      {mapElement && (
        <div className="bg-white border border-slate-200 rounded-2xl p-3 shadow-sm space-y-2 animate-fade-in">
          <div className="flex items-center justify-between px-1">
            <div className="flex items-center gap-2">
              <span className="w-2.5 h-2.5 rounded-full bg-emerald-500 radar-pulse" />
              <span className="font-heading font-black text-slate-900 text-xs sm:text-sm">
                Mini-Mapa de Indaiatuba-SP
              </span>
            </div>
            {onOpenFullMap && (
              <button
                type="button"
                onClick={onOpenFullMap}
                className="bg-[#ff6a00] hover:bg-[#e05e00] active:scale-95 text-white font-heading font-black text-xs py-1.5 px-3 rounded-xl shadow-md flex items-center gap-1.5 border border-[#ff8533] cursor-pointer transition-all uppercase tracking-wider"
              >
                <Maximize2 className="w-3.5 h-3.5" />
                <span>Ver mapa em tela cheia</span>
              </button>
            )}
          </div>

          {/* Container do Mini-Map exatamente com 180px de altura */}
          <div className="w-full h-[180px] rounded-xl overflow-hidden relative border border-slate-200 shadow-inner group">
            {mapElement}
            {onOpenFullMap && (
              <button
                type="button"
                onClick={onOpenFullMap}
                className="absolute top-2.5 right-2.5 z-[500] bg-white/95 hover:bg-white text-slate-950 font-black text-[11px] px-3 py-1.5 rounded-xl shadow-lg border border-slate-300 flex items-center gap-1.5 cursor-pointer transition-all hover:scale-105 active:scale-95"
                title="Abrir mapa em tela cheia"
              >
                <Maximize2 className="w-3.5 h-3.5 text-[#ff6a00]" />
                <span>Tela Cheia</span>
              </button>
            )}
          </div>

          <div className="flex items-center justify-between text-[11px] text-slate-600 px-1 font-mono">
            <span>Chega em ~{Math.max(Math.round(dynamicDistanceKm * 2.2), 3)} min • {dynamicDistanceKm} km</span>
            {onOpenFullMap && (
              <button
                type="button"
                onClick={onOpenFullMap}
                className="text-[#ff6a00] hover:underline font-bold flex items-center gap-1 cursor-pointer"
              >
                <Maximize2 className="w-3 h-3" />
                <span>Ver rota completa</span>
              </button>
            )}
          </div>
        </div>
      )}

      {/* Category Selection Cards with Dedicated "Confirmar" Button on each option */}
      <div className="space-y-3">
        <div className="flex items-center justify-between">
          <label className="text-sm font-heading font-black text-slate-900 uppercase tracking-wider">
            Opções de Corrida RACE (Cálculo Automático por Km)
          </label>
          <span className="text-xs sm:text-sm text-amber-700 font-mono font-bold bg-amber-50 px-2.5 py-1 rounded-full border border-amber-200">
            Distância da rota: {dynamicDistanceKm} km
          </span>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3.5">
          {/* 1. Econômica - R$ 2,50/km */}
          {(() => {
            const cat = VEHICLE_CATEGORIES.economica;
            const fare = calculateFare('economica', dynamicDistanceKm);
            const isSelected = selectedCategory === 'economica';

            return (
              <div
                onClick={() => setSelectedCategory('economica')}
                className={`p-5 rounded-2xl border-2 transition-all cursor-pointer relative flex flex-col justify-between shadow-md ${
                  isSelected
                    ? 'bg-amber-50/60 border-amber-500 shadow-amber-500/10'
                    : 'bg-white border-slate-200 hover:border-slate-400'
                }`}
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
                            {cat.name}
                          </span>
                          <span className="bg-amber-500 text-slate-950 font-black text-xs px-2 py-0.5 rounded font-mono shadow-sm">
                            R$ 2,50/km
                          </span>
                        </div>
                        <p className="text-xs sm:text-sm text-slate-600 font-medium leading-tight mt-1">
                          {cat.capacity} • {cat.estimatedTimeMin} min
                        </p>
                      </div>
                    </div>

                    <div className="text-right">
                      <span className="font-heading font-black text-slate-950 text-xl sm:text-2xl">
                        {formatBRL(fare.totalPrice)}
                      </span>
                      <p className="text-xs text-slate-500 font-medium">Base R$5 + km</p>
                    </div>
                  </div>

                  <div className="mt-3 text-xs text-slate-600 border-t border-slate-200 pt-2 flex items-center justify-between font-medium">
                    <span>{cat.tagline}</span>
                    <span className="text-emerald-700 font-bold">100% ao motorista</span>
                  </div>
                </div>

                {/* Botão Confirmar dedicado para a opção Econômica */}
                <button
                  type="button"
                  onClick={(e) => {
                    e.stopPropagation();
                    handleRequestRideWithCategory('economica');
                  }}
                  className="w-full mt-4 py-3.5 px-4 rounded-xl font-heading font-black text-sm sm:text-base flex items-center justify-center gap-2 transition-all shadow-md active:scale-95 cursor-pointer bg-amber-500 hover:bg-amber-400 text-slate-950 border border-amber-400"
                >
                  <CheckCircle2 className="w-5 h-5 fill-slate-950 text-amber-400" />
                  <span>Confirmar RACE Econômica ({formatBRL(fare.totalPrice)})</span>
                </button>
              </div>
            );
          })()}

          {/* 2. Confort - R$ 3,50/km */}
          {(() => {
            const cat = VEHICLE_CATEGORIES.confort;
            const fare = calculateFare('confort', dynamicDistanceKm);
            const isSelected = selectedCategory === 'confort';

            return (
              <div
                onClick={() => setSelectedCategory('confort')}
                className={`p-5 rounded-2xl border-2 transition-all cursor-pointer relative flex flex-col justify-between shadow-md ${
                  isSelected
                    ? 'bg-purple-50/60 border-purple-500 shadow-purple-500/10'
                    : 'bg-white border-slate-200 hover:border-slate-400'
                }`}
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
                            {cat.name}
                          </span>
                          <span className="bg-purple-600 text-white font-black text-xs px-2 py-0.5 rounded font-mono shadow-sm">
                            R$ 3,50/km
                          </span>
                        </div>
                        <p className="text-xs sm:text-sm text-slate-600 font-medium leading-tight mt-1">
                          Sedans e SUVs novos • {cat.estimatedTimeMin} min
                        </p>
                      </div>
                    </div>

                    <div className="text-right">
                      <span className="font-heading font-black text-purple-900 text-xl sm:text-2xl">
                        {formatBRL(fare.totalPrice)}
                      </span>
                      <p className="text-xs text-slate-500 font-medium">Base R$7 + km</p>
                    </div>
                  </div>

                  <div className="mt-3 text-xs text-slate-600 border-t border-slate-200 pt-2 flex items-center justify-between font-medium">
                    <span>{cat.tagline}</span>
                    <span className="text-emerald-700 font-bold">100% ao motorista</span>
                  </div>
                </div>

                {/* Botão Confirmar dedicado para a opção Confort */}
                <button
                  type="button"
                  onClick={(e) => {
                    e.stopPropagation();
                    handleRequestRideWithCategory('confort');
                  }}
                  className="w-full mt-4 py-3.5 px-4 rounded-xl font-heading font-black text-sm sm:text-base flex items-center justify-center gap-2 transition-all shadow-md active:scale-95 cursor-pointer bg-purple-700 hover:bg-purple-600 text-white border border-purple-600"
                >
                  <CheckCircle2 className="w-5 h-5 fill-white text-purple-700" />
                  <span>Confirmar RACE Confort ({formatBRL(fare.totalPrice)})</span>
                </button>
              </div>
            );
          })()}

          {/* 3. Motoboy Passageiro - R$ 1,80/km */}
          {(() => {
            const cat = VEHICLE_CATEGORIES.moto_passageiro;
            const fare = calculateFare('moto_passageiro', dynamicDistanceKm);
            const isSelected = selectedCategory === 'moto_passageiro';

            return (
              <div
                onClick={() => setSelectedCategory('moto_passageiro')}
                className={`p-5 rounded-2xl border-2 transition-all cursor-pointer relative flex flex-col justify-between shadow-md ${
                  isSelected
                    ? 'bg-cyan-50/60 border-cyan-500 shadow-cyan-500/10'
                    : 'bg-white border-slate-200 hover:border-slate-400'
                }`}
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
                            {cat.name}
                          </span>
                          <span className="bg-cyan-600 text-white font-black text-xs px-2 py-0.5 rounded font-mono shadow-sm">
                            R$ 1,80/km
                          </span>
                        </div>
                        <p className="text-xs sm:text-sm text-slate-600 font-medium leading-tight mt-1">
                          Mais rápido no trânsito • {cat.estimatedTimeMin} min
                        </p>
                      </div>
                    </div>

                    <div className="text-right">
                      <span className="font-heading font-black text-cyan-900 text-xl sm:text-2xl">
                        {formatBRL(fare.totalPrice)}
                      </span>
                      <p className="text-xs text-slate-500 font-medium">Capacete incluso</p>
                    </div>
                  </div>

                  <div className="mt-3 text-xs text-slate-600 border-t border-slate-200 pt-2 flex items-center justify-between font-medium">
                    <span>{cat.tagline}</span>
                    <span className="text-emerald-700 font-bold">100% ao motoboy</span>
                  </div>
                </div>

                {/* Botão Confirmar dedicado para Motoboy Passageiro */}
                <button
                  type="button"
                  onClick={(e) => {
                    e.stopPropagation();
                    handleRequestRideWithCategory('moto_passageiro');
                  }}
                  className="w-full mt-4 py-3.5 px-4 rounded-xl font-heading font-black text-sm sm:text-base flex items-center justify-center gap-2 transition-all shadow-md active:scale-95 cursor-pointer bg-cyan-600 hover:bg-cyan-500 text-white border border-cyan-500"
                >
                  <CheckCircle2 className="w-5 h-5 fill-white text-cyan-600" />
                  <span>Confirmar Moto Passageiro ({formatBRL(fare.totalPrice)})</span>
                </button>
              </div>
            );
          })()}

          {/* 4. Motoboy Entrega Flash - R$ 2,00/km */}
          {(() => {
            const cat = VEHICLE_CATEGORIES.moto_entrega;
            const fare = calculateFare('moto_entrega', dynamicDistanceKm);
            const isSelected = selectedCategory === 'moto_entrega';

            return (
              <div
                onClick={() => setSelectedCategory('moto_entrega')}
                className={`p-5 rounded-2xl border-2 transition-all cursor-pointer relative flex flex-col justify-between shadow-md ${
                  isSelected
                    ? 'bg-amber-50/60 border-amber-500 shadow-amber-500/10'
                    : 'bg-white border-slate-200 hover:border-slate-400'
                }`}
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
                            {cat.name}
                          </span>
                          <span className="bg-amber-500 text-slate-950 font-black text-xs px-2 py-0.5 rounded font-mono shadow-sm">
                            R$ 2,00/km
                          </span>
                        </div>
                        <p className="text-xs sm:text-sm text-slate-600 font-medium leading-tight mt-1">
                          Delivery & Encomendas • {cat.estimatedTimeMin} min
                        </p>
                      </div>
                    </div>

                    <div className="text-right">
                      <span className="font-heading font-black text-slate-950 text-xl sm:text-2xl">
                        {formatBRL(fare.totalPrice)}
                      </span>
                      <p className="text-xs text-slate-500 font-medium">Baú até 20kg</p>
                    </div>
                  </div>

                  <div className="mt-3 text-xs text-slate-600 border-t border-slate-200 pt-2 flex items-center justify-between font-medium">
                    <span>{cat.tagline}</span>
                    <span className="text-emerald-700 font-bold">100% ao motoboy</span>
                  </div>
                </div>

                {/* Botão Confirmar dedicado para Motoboy Entrega Flash */}
                <button
                  type="button"
                  onClick={(e) => {
                    e.stopPropagation();
                    handleRequestRideWithCategory('moto_entrega');
                  }}
                  className="w-full mt-4 py-3.5 px-4 rounded-xl font-heading font-black text-sm sm:text-base flex items-center justify-center gap-2 transition-all shadow-md active:scale-95 cursor-pointer bg-gradient-to-r from-amber-500 via-amber-400 to-amber-500 hover:brightness-105 text-slate-950 border border-amber-400"
                >
                  <CheckCircle2 className="w-5 h-5 fill-slate-950 text-amber-400" />
                  <span>Confirmar Moto Entrega Flash ({formatBRL(fare.totalPrice)})</span>
                </button>
              </div>
            );
          })()}
        </div>
      </div>



      {/* Digital Payment with Encryption & Security */}
      <div className="bg-white border border-slate-200 rounded-3xl p-5 sm:p-6 space-y-4 shadow-md">
        <div className="flex items-center justify-between pb-3 border-b border-slate-200">
          <div className="flex items-center gap-2.5">
            <Lock className="w-5 h-5 text-emerald-600" />
            <h3 className="font-heading font-black text-slate-900 text-sm sm:text-base uppercase tracking-wider">
              Pagamento Digital Criptografado
            </h3>
          </div>
          <span className="text-xs sm:text-sm text-slate-600 font-semibold flex items-center gap-1.5 bg-slate-100 px-3 py-1 rounded-full border border-slate-200">
            <ShieldCheck className="w-4 h-4 text-emerald-600" />
            TLS 256-bit Seguro
          </span>
        </div>

        <div className="grid grid-cols-3 gap-3">
          <button
            type="button"
            onClick={() => setPaymentMethod('pix')}
            className={`p-3.5 rounded-2xl border-2 flex flex-col items-center justify-center gap-1.5 transition-all cursor-pointer ${
              paymentMethod === 'pix'
                ? 'bg-emerald-50 border-emerald-500 text-emerald-900 font-extrabold shadow-sm'
                : 'bg-slate-50 border-slate-200 text-slate-700 hover:bg-white'
            }`}
          >
            <QrCode className="w-5 h-5 text-emerald-600" />
            <span className="text-sm font-bold">PIX Instantâneo</span>
            <span className="text-xs text-emerald-700 font-bold">Sem taxas</span>
          </button>

          <button
            type="button"
            onClick={() => setPaymentMethod('credit_card')}
            className={`p-3.5 rounded-2xl border-2 flex flex-col items-center justify-center gap-1.5 transition-all cursor-pointer ${
              paymentMethod === 'credit_card'
                ? 'bg-amber-50 border-amber-500 text-amber-900 font-extrabold shadow-sm'
                : 'bg-slate-50 border-slate-200 text-slate-700 hover:bg-white'
            }`}
          >
            <CreditCard className="w-5 h-5 text-amber-600" />
            <span className="text-sm font-bold">Cartão Token</span>
            <span className="text-xs text-slate-500 font-medium">•••• 4490</span>
          </button>

          <button
            type="button"
            onClick={() => setPaymentMethod('race_pay')}
            className={`p-3.5 rounded-2xl border-2 flex flex-col items-center justify-center gap-1.5 transition-all cursor-pointer ${
              paymentMethod === 'race_pay'
                ? 'bg-purple-50 border-purple-500 text-purple-900 font-extrabold shadow-sm'
                : 'bg-slate-50 border-slate-200 text-slate-700 hover:bg-white'
            }`}
          >
            <Wallet className="w-5 h-5 text-purple-600" />
            <span className="text-sm font-bold">RACE Pay</span>
            <span className="text-xs text-purple-700 font-bold">Saldo: R$ 85,00</span>
          </button>
        </div>
      </div>

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
