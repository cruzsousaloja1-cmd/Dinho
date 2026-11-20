import React, { useState, useEffect, useRef } from 'react';
import { calculateFare, formatBRL } from '../services/pricingService';
import { Driver, Ride, LocationPoint } from '../types';
import { 
  searchAddressAutocomplete, 
  calculateDistanceKm, 
  requestCurrentLocationFast,
  openAppLocationSettings,
  DEFAULT_MANUAL_PICKUP_EXAMPLE,
  DEFAULT_MANUAL_PICKUP_COORDS,
  GPS_MANUAL_FALLBACK_MESSAGE,
  AddressSuggestion, 
  POPULAR_DATABASE_LOCATIONS 
} from '../services/addressSearchService';
import { 
  PackageCheck, 
  MapPin, 
  Lock, 
  User, 
  Phone, 
  ArrowRight,
  Search,
  Loader2,
  Crosshair,
  X,
  Sparkles,
  ShieldCheck,
  CheckCircle2
} from 'lucide-react';
import confetti from 'canvas-confetti';

interface DeliveryFlashViewProps {
  onStartDelivery: (ride: Ride) => void;
  availableMotoboys: Driver[];
  pickup?: LocationPoint | null;
  destination?: LocationPoint | null;
  setPickup?: (p: LocationPoint | null) => void;
  setDestination?: (d: LocationPoint | null) => void;
}

export const DeliveryFlashView: React.FC<DeliveryFlashViewProps> = ({
  onStartDelivery,
  availableMotoboys,
  pickup,
  destination,
  setPickup,
  setDestination,
}) => {
  const [pickupInput, setPickupInput] = useState(pickup?.address || '');
  const [destInput, setDestInput] = useState(destination?.address || '');
  const [recipientName, setRecipientName] = useState('');
  const [recipientPhone, setRecipientPhone] = useState('');
  const [packageType, setPackageType] = useState('');
  const [instructions, setInstructions] = useState('');
  const [securityCode] = useState(() => String(Math.floor(1000 + Math.random() * 9000)));

  // Autocomplete state
  const [pickupSuggestions, setPickupSuggestions] = useState<AddressSuggestion[]>([]);
  const [destSuggestions, setDestSuggestions] = useState<AddressSuggestion[]>([]);
  const [activeDropdown, setActiveDropdown] = useState<'pickup' | 'destination' | null>(null);
  const [isSearchingPickup, setIsSearchingPickup] = useState(false);
  const [isSearchingDest, setIsSearchingDest] = useState(false);
  const [isLocatingUser, setIsLocatingUser] = useState(false);
  const [gpsErrorNotice, setGpsErrorNotice] = useState<string | null>(null);
  const [gpsPermissionDenied, setGpsPermissionDenied] = useState(false);

  const searchTimeoutRef = useRef<any>(null);

  // Sync inputs when props change
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

  // Dynamic distance calculation
  const distanceKm = pickup && destination
    ? calculateDistanceKm(pickup.lat, pickup.lng, destination.lat, destination.lng)
    : 4.8;

  const fare = calculateFare('moto_entrega', distanceKm);

  // Autocomplete for Pickup (Coleta)
  const handlePickupChange = (value: string) => {
    setPickupInput(value);
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

  // Autocomplete for Destination (Entrega)
  const handleDestChange = (value: string) => {
    setDestInput(value);
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

  const handleSelectSuggestion = (type: 'pickup' | 'destination', suggestion: AddressSuggestion) => {
    if (type === 'pickup') {
      if (setPickup) {
        setPickup({
          address: suggestion.label,
          lat: suggestion.lat,
          lng: suggestion.lng,
        });
      }
      setPickupInput(suggestion.mainText);
    } else {
      if (setDestination) {
        setDestination({
          address: suggestion.label,
          lat: suggestion.lat,
          lng: suggestion.lng,
        });
      }
      setDestInput(suggestion.mainText);
    }
    setActiveDropdown(null);
  };

  const applyManualPickupFallback = (permissionDenied: boolean) => {
    setGpsPermissionDenied(permissionDenied);
    setGpsErrorNotice(GPS_MANUAL_FALLBACK_MESSAGE);
    if (!pickupInput.trim()) {
      setPickupInput(DEFAULT_MANUAL_PICKUP_EXAMPLE);
      if (setPickup) {
        setPickup({
          address: DEFAULT_MANUAL_PICKUP_EXAMPLE,
          lat: DEFAULT_MANUAL_PICKUP_COORDS.lat,
          lng: DEFAULT_MANUAL_PICKUP_COORDS.lng,
        });
      }
    }
  };

  const handleUseCurrentLocation = async () => {
    if (isLocatingUser) return;

    setIsLocatingUser(true);
    setGpsErrorNotice(null);
    setGpsPermissionDenied(false);
    setActiveDropdown(null);

    try {
      const result = await requestCurrentLocationFast({ maxWaitMs: 10000 });
      if (
        (result.status === 'ok' || result.status === 'fallback_saved') &&
        result.fullAddress &&
        typeof result.lat === 'number' &&
        typeof result.lng === 'number'
      ) {
        if (setPickup) setPickup({ address: result.fullAddress, lat: result.lat, lng: result.lng });
        setPickupInput(result.fullAddress);
        setGpsPermissionDenied(false);
        if (result.status === 'fallback_saved' && result.notice) {
          setGpsErrorNotice(result.notice);
        }
        return;
      }
      applyManualPickupFallback(result.errorCode === 'PERMISSION_DENIED');
    } catch {
      applyManualPickupFallback(false);
    } finally {
      setIsLocatingUser(false);
    }
  };

  const handleCreateDelivery = () => {
    const motoboy = availableMotoboys.find(
      (m) => m.category === 'moto_entrega' && m.status === 'online' && m.approvalStatus === 'aprovado'
    ) || availableMotoboys.find((m) => m.approvalStatus === 'aprovado') || availableMotoboys[0];

    const finalPickup: LocationPoint = pickup || {
      address: pickupInput || 'Parque Ecológico de Indaiatuba',
      lat: -23.0955,
      lng: -47.2250,
    };

    const finalDest: LocationPoint = destination || {
      address: destInput || 'Jardim Morada do Sol, Indaiatuba',
      lat: -23.1180,
      lng: -47.2380,
      contactName: recipientName,
      contactPhone: recipientPhone,
    };

    const deliveryRide: Ride = {
      id: '',
      passengerName: `Envio Flash (${packageType || 'Entrega'})`,
      passengerPhone: '',
      passengerRating: 0,
      driver: motoboy,
      category: 'moto_entrega',
      pickup: finalPickup,
      destination: finalDest,
      distanceKm,
      durationMinutes: Math.round(distanceKm * 2),
      price: fare.totalPrice,
      driverEarnings: fare.driverEarnings, // 85% para o motoboy
      platformFee: fare.platformFee,       // 15% comissão Race
      paymentMethod: 'pix',
      paymentStatus: 'pending',
      status: 'procurando',
      createdAt: new Date().toISOString(),
      deliveryDetails: {
        packageType,
        instructions,
        deliveryCode: securityCode,
        recipientName,
      },
    };

    onStartDelivery(deliveryRide);
  };

  return (
    <div className="space-y-5">
      {/* Flash Banner in Clean White Theme */}
      <div className="bg-white border-2 border-purple-200 rounded-3xl p-5 sm:p-6 shadow-md">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-4">
            <div className="w-14 h-14 rounded-2xl bg-purple-100 text-purple-700 flex items-center justify-center border border-purple-200 shrink-0">
              <PackageCheck className="w-8 h-8" />
            </div>
            <div>
              <div className="flex items-center gap-2.5">
                <h2 className="font-heading font-black text-slate-950 text-xl sm:text-2xl">
                  RACE FLASH ENTREGAS
                </h2>
                <span className="bg-purple-600 text-white font-extrabold text-xs px-2.5 py-0.5 rounded-full font-mono shadow-sm">
                  R$ 2,00 / km
                </span>
              </div>
              <p className="text-sm text-slate-600 font-medium mt-0.5">
                Motoboy dedicado com baú seguro e rastreamento em tempo real
              </p>
            </div>
          </div>

          <div className="hidden sm:block text-right">
            <span className="text-sm text-purple-800 font-black bg-purple-50 px-2.5 py-1 rounded-full border border-purple-200 block">
              Entrega Expressa Indaiatuba
            </span>
            <span className="text-xs text-slate-500 font-medium mt-1 block">Pagamento fácil no app</span>
          </div>
        </div>
      </div>

      {/* Form Card in White */}
      <div className="bg-white border border-slate-200 rounded-3xl p-5 sm:p-6 space-y-5 shadow-md">
        {/* Addresses with Autocomplete */}
        <div className="space-y-3">
          <div className="flex items-center justify-between">
            <h3 className="font-heading font-black text-slate-900 text-sm sm:text-base uppercase tracking-wider flex items-center gap-2">
              <MapPin className="w-5 h-5 text-purple-600" />
              <span>Itinerário com Busca Automática</span>
            </h3>
            <span className="text-xs font-bold text-slate-500 bg-slate-100 px-2 py-0.5 rounded-md">
              {distanceKm} km calculados
            </span>
          </div>

          <div className="space-y-3 relative">
            {/* Campo de Coleta / Remetente */}
            <div className="relative">
              <div className="relative flex items-start">
                <textarea
                  rows={2}
                  value={pickupInput}
                  onChange={(e) => handlePickupChange(e.target.value.replace(/\r?\n/g, ' '))}
                  onKeyDown={(e) => {
                    if (e.key === 'Enter') {
                      e.preventDefault();
                      setActiveDropdown(null);
                    }
                  }}
                  onFocus={() => {
                    setActiveDropdown('pickup');
                    if (pickupSuggestions.length === 0) {
                      setPickupSuggestions(POPULAR_DATABASE_LOCATIONS.slice(0, 4));
                    }
                  }}
                  placeholder="Buscar endereço automático de Coleta..."
                  style={{
                    width: '100%',
                    whiteSpace: 'normal',
                    wordWrap: 'break-word',
                    overflowWrap: 'anywhere',
                    textAlign: 'left',
                    paddingLeft: '16px',
                  }}
                  className="w-full bg-slate-50 border border-slate-300 rounded-2xl pl-4 pr-28 py-3 text-sm sm:text-base text-slate-950 placeholder-slate-400 focus:outline-none focus:border-purple-600 focus:bg-white focus:ring-2 focus:ring-purple-100 font-medium transition-all resize-none whitespace-normal break-words text-left leading-snug"
                />
                
                <div className="absolute right-2.5 top-2.5 flex items-center gap-1.5">
                  {isSearchingPickup && (
                    <Loader2 className="w-4 h-4 text-purple-600 animate-spin" />
                  )}
                  {pickupInput && (
                    <button
                      type="button"
                      onClick={() => {
                        setPickupInput('');
                        if (setPickup) setPickup(null);
                      }}
                      className="p-1 text-slate-400 hover:text-slate-600 cursor-pointer"
                      title="Limpar"
                    >
                      <X className="w-4 h-4" />
                    </button>
                  )}
                  <button
                    type="button"
                    onClick={handleUseCurrentLocation}
                    disabled={isLocatingUser}
                    className="flex items-center gap-1 bg-emerald-50 hover:bg-emerald-100 text-emerald-700 border border-emerald-200 px-2 py-1 rounded-lg text-xs font-bold transition-colors cursor-pointer"
                    title="Usar minha localização GPS"
                  >
                    {isLocatingUser ? (
                      <>
                        <Loader2 className="w-3.5 h-3.5 animate-spin" />
                        <span>Buscando GPS preciso...</span>
                      </>
                    ) : (
                      <>
                        <Crosshair className="w-3.5 h-3.5" />
                        <span>Meu GPS</span>
                      </>
                    )}
                  </button>
                </div>
              </div>

              <div className="mt-2 flex flex-wrap items-center gap-2">
                <button
                  type="button"
                  onClick={handleUseCurrentLocation}
                  disabled={isLocatingUser}
                  className="px-2.5 py-1 bg-slate-100 hover:bg-emerald-50 border border-slate-300 text-slate-800 text-xs font-bold rounded-lg cursor-pointer inline-flex items-center gap-1 disabled:opacity-60"
                >
                  <Crosshair className="w-3 h-3 text-emerald-600" />
                  <span>Usar minha localização</span>
                </button>
                {gpsPermissionDenied && (
                  <button
                    type="button"
                    onClick={() => {
                      const opened = openAppLocationSettings();
                      if (!opened) void handleUseCurrentLocation();
                    }}
                    className="px-2.5 py-1 bg-slate-900 hover:bg-slate-800 text-white text-xs font-bold rounded-lg cursor-pointer inline-flex items-center gap-1"
                  >
                    <MapPin className="w-3 h-3 text-emerald-400" />
                    <span>Permitir localização</span>
                  </button>
                )}
                {gpsErrorNotice && (
                  <span className="text-xs font-bold text-slate-600">
                    {gpsErrorNotice}
                  </span>
                )}
              </div>

              {/* Suggestions Dropdown for Coleta */}
              {activeDropdown === 'pickup' && (
                <div className="absolute left-0 right-0 top-full mt-1.5 bg-white border-2 border-purple-200 rounded-2xl shadow-2xl z-50 overflow-hidden divide-y divide-slate-100 max-h-64 overflow-y-auto overscroll-contain">
                  <div className="px-3 py-1.5 bg-slate-50 flex items-center justify-between text-xs font-bold text-slate-600">
                    <span className="flex items-center gap-1">
                      <Search className="w-3 h-3 text-purple-600" />
                      Sugestões Automáticas de Coleta
                    </span>
                    <button
                      type="button"
                      onClick={() => setActiveDropdown(null)}
                      className="text-slate-400 hover:text-slate-600"
                    >
                      Fechar
                    </button>
                  </div>
                  {pickupSuggestions.map((item) => (
                    <button
                      key={item.id}
                      type="button"
                      onClick={() => handleSelectSuggestion('pickup', item)}
                      className="w-full text-left px-4 py-2.5 hover:bg-purple-50 transition-colors flex items-start gap-3 cursor-pointer group"
                    >
                      <div className="p-1.5 rounded-lg bg-emerald-50 text-emerald-700 mt-0.5 group-hover:bg-purple-100 group-hover:text-purple-700 transition-colors">
                        <MapPin className="w-4 h-4" />
                      </div>
                      <div className="flex-1 min-w-0">
                        <div className="text-sm font-bold text-slate-900 whitespace-normal break-words">
                          {item.label}
                        </div>
                        <div className="text-xs text-slate-500 whitespace-normal break-words">
                          {item.secondaryText}
                        </div>
                      </div>
                    </button>
                  ))}
                </div>
              )}
            </div>

            {/* Campo de Entrega / Destinatário */}
            <div className="relative">
              <div className="relative flex items-start">
                <textarea
                  rows={2}
                  value={destInput}
                  onChange={(e) => handleDestChange(e.target.value.replace(/\r?\n/g, ' '))}
                  onKeyDown={(e) => {
                    if (e.key === 'Enter') {
                      e.preventDefault();
                      setActiveDropdown(null);
                    }
                  }}
                  onFocus={() => {
                    setActiveDropdown('destination');
                    if (destSuggestions.length === 0) {
                      setDestSuggestions(POPULAR_DATABASE_LOCATIONS.slice(0, 4));
                    }
                  }}
                  placeholder="Buscar endereço automático de Entrega..."
                  style={{
                    width: '100%',
                    whiteSpace: 'normal',
                    wordWrap: 'break-word',
                    overflowWrap: 'anywhere',
                    textAlign: 'left',
                    paddingLeft: '16px',
                  }}
                  className="w-full bg-slate-50 border border-slate-300 rounded-2xl pl-4 pr-14 py-3 text-sm sm:text-base text-slate-950 placeholder-slate-400 focus:outline-none focus:border-purple-600 focus:bg-white focus:ring-2 focus:ring-purple-100 font-medium transition-all resize-none whitespace-normal break-words text-left leading-snug"
                />
                
                <div className="absolute right-3 top-3 flex items-center gap-1.5">
                  {isSearchingDest && (
                    <Loader2 className="w-4 h-4 text-purple-600 animate-spin" />
                  )}
                  {destInput && (
                    <button
                      type="button"
                      onClick={() => {
                        setDestInput('');
                        if (setDestination) setDestination(null);
                      }}
                      className="p-1 text-slate-400 hover:text-slate-600 cursor-pointer"
                      title="Limpar"
                    >
                      <X className="w-4 h-4" />
                    </button>
                  )}
                </div>
              </div>

              {/* Suggestions Dropdown for Entrega */}
              {activeDropdown === 'destination' && (
                <div className="absolute left-0 right-0 top-full mt-1.5 bg-white border-2 border-purple-200 rounded-2xl shadow-2xl z-50 overflow-hidden divide-y divide-slate-100 max-h-64 overflow-y-auto overscroll-contain">
                  <div className="px-3 py-1.5 bg-slate-50 flex items-center justify-between text-xs font-bold text-slate-600">
                    <span className="flex items-center gap-1">
                      <Search className="w-3 h-3 text-purple-600" />
                      Sugestões Automáticas de Entrega
                    </span>
                    <button
                      type="button"
                      onClick={() => setActiveDropdown(null)}
                      className="text-slate-400 hover:text-slate-600"
                    >
                      Fechar
                    </button>
                  </div>
                  {destSuggestions.map((item) => (
                    <button
                      key={item.id}
                      type="button"
                      onClick={() => handleSelectSuggestion('destination', item)}
                      className="w-full text-left px-4 py-2.5 hover:bg-purple-50 transition-colors flex items-start gap-3 cursor-pointer group"
                    >
                      <div className="p-1.5 rounded-lg bg-purple-50 text-purple-700 mt-0.5 group-hover:bg-purple-100 transition-colors">
                        <MapPin className="w-4 h-4" />
                      </div>
                      <div className="flex-1 min-w-0">
                        <div className="text-sm font-bold text-slate-900 truncate">
                          {item.mainText}
                        </div>
                        <div className="text-xs text-slate-500 truncate">
                          {item.secondaryText}
                        </div>
                      </div>
                    </button>
                  ))}
                </div>
              )}
            </div>
          </div>
        </div>

        {/* Recipient Details & Security Code */}
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3.5 pt-2 border-t border-slate-200">
          <div>
            <label className="text-xs sm:text-sm text-slate-700 font-bold mb-1.5 block">
              Nome de quem vai receber
            </label>
            <div className="relative">
              <input
                type="text"
                value={recipientName}
                onChange={(e) => setRecipientName(e.target.value)}
                className="w-full bg-slate-50 border border-slate-300 rounded-xl px-4 py-2.5 text-sm sm:text-base text-slate-950 focus:outline-none focus:border-purple-500 font-medium"
              />
              <User className="w-4 h-4 text-slate-400 absolute right-3.5 top-3" />
            </div>
          </div>

          <div>
            <label className="text-xs sm:text-sm text-slate-700 font-bold mb-1.5 block">
              WhatsApp / Telefone para aviso
            </label>
            <div className="relative">
              <input
                type="text"
                value={recipientPhone}
                onChange={(e) => setRecipientPhone(e.target.value)}
                className="w-full bg-slate-50 border border-slate-300 rounded-xl px-4 py-2.5 text-sm sm:text-base text-slate-950 focus:outline-none focus:border-purple-500 font-medium"
              />
              <Phone className="w-4 h-4 text-slate-400 absolute right-3.5 top-3" />
            </div>
          </div>
        </div>

        {/* Package Preset & Instructions */}
        <div className="space-y-3 pt-2 border-t border-slate-200">
          <label className="text-xs sm:text-sm text-slate-700 font-bold block">
            O que você está enviando?
          </label>
          <div className="flex flex-wrap gap-2">
            {[
              'Documentos & Contratos',
              'Peças / Chaves',
              'Alimentos / Bebidas',
              'Eletrônicos & Acessórios',
              'Pacote Médio (até 15kg)',
            ].map((p) => (
              <button
                key={p}
                type="button"
                onClick={() => setPackageType(p)}
                className={`text-xs sm:text-sm px-3.5 py-2 rounded-xl border transition-all cursor-pointer font-bold ${
                  packageType === p
                    ? 'bg-purple-100 border-purple-500 text-purple-900 shadow-sm'
                    : 'bg-slate-50 border-slate-200 text-slate-700 hover:bg-slate-100'
                }`}
              >
                {p}
              </button>
            ))}
          </div>

          <div className="pt-1">
            <input
              type="text"
              value={instructions}
              onChange={(e) => setInstructions(e.target.value)}
              placeholder="Instruções para o motoboy (ex: Interfone 42, deixar na portaria)"
              className="w-full bg-slate-50 border border-slate-300 rounded-xl px-4 py-2.5 text-sm sm:text-base text-slate-950 placeholder-slate-400 focus:outline-none focus:border-purple-500 font-medium"
            />
          </div>
        </div>

        {/* Anti-Fraud Security Code */}
        <div className="bg-purple-50 p-4 rounded-2xl border border-purple-200 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-purple-200 text-purple-800 flex items-center justify-center font-bold">
              <Lock className="w-5 h-5" />
            </div>
            <div>
              <span className="text-sm font-bold text-slate-900 block">
                Código de Segurança de Entrega
              </span>
              <span className="text-xs text-slate-600 font-medium">
                O motoboy só finaliza com estes 4 dígitos
              </span>
            </div>
          </div>

          <div className="bg-white border border-purple-300 text-purple-900 font-mono text-xl font-black px-4 py-1.5 rounded-xl tracking-widest shadow-sm">
            {securityCode}
          </div>
        </div>

        {/* Pricing Summary */}
        <div className="bg-slate-50 p-4 rounded-2xl border border-slate-200 flex items-center justify-between">
          <div>
            <span className="text-xs text-slate-500 uppercase font-bold block">
              Tarifa RACE Flash ({distanceKm} km)
            </span>
            <div className="text-sm text-slate-800 font-medium">
              Taxa Base R$ 4,50 + ({distanceKm} km × R$ 2,00/km)
            </div>
          </div>

          <div className="text-right">
            <span className="text-[11px] uppercase font-bold text-slate-500 block">Valor Total</span>
            <span className="font-heading font-black text-2xl text-purple-900">
              {formatBRL(fare.totalPrice)}
            </span>
          </div>
        </div>

        {/* Submit */}
        <button
          onClick={handleCreateDelivery}
          className="w-full bg-purple-700 hover:bg-purple-600 active:scale-98 text-white font-heading font-black py-4 px-6 rounded-2xl shadow-lg flex items-center justify-between cursor-pointer transition-all border border-purple-600 text-sm sm:text-base"
        >
          <div className="flex items-center gap-2.5">
            <PackageCheck className="w-6 h-6" />
            <span>SOLICITAR MOTOBOY FLASH</span>
          </div>
          <div className="flex items-center gap-1.5 font-mono text-base font-bold">
            <span>{formatBRL(fare.totalPrice)}</span>
            <ArrowRight className="w-5 h-5" />
          </div>
        </button>
      </div>
    </div>
  );
};
