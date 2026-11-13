import React, { useEffect, useRef, useState } from 'react';
import L from 'leaflet';
import 'leaflet/dist/leaflet.css';
import {
  ArrowLeft,
  CornerUpRight,
  CornerUpLeft,
  ArrowUp,
  Crosshair,
  Volume2,
  VolumeX,
  Phone,
  CheckCircle2,
  Navigation,
  MapPin,
  Flag,
  ChevronUp,
  ChevronDown,
  Clock,
  Route,
  XCircle,
  AlertTriangle,
  MessageCircle,
  CreditCard,
  QrCode,
  Wallet,
  Play,
  Lock,
  ShieldCheck,
  KeyRound,
  Delete,
  ExternalLink,
} from 'lucide-react';
import {
  INDAIATUBA_BOUNDS,
  INDAIATUBA_MIN_ZOOM,
  INDAIATUBA_MAX_ZOOM,
} from '../config/indaiatuba';
import {
  fetchRealStreetRoute,
  calculateBearing,
  StreetRouteResult,
  INDAIATUBA_REAL_STREET_COORDINATES,
  INDAIATUBA_REAL_STEPS,
} from '../services/osrmRoutingService';
import { formatBRL, generateUniqueRideConfirmationCode } from '../services/pricingService';
import {
  isAudioEnabled,
  setAudioEnabled,
  speakNavigationInstruction,
} from '../services/audioNotificationService';
import { Driver, Ride } from '../types';

type DriverTripPhase = 'to_pickup' | 'arrived_pickup' | 'to_destination' | 'completed';
type CardSizeState = 'minimized' | 'medium' | 'expanded';

interface DriverGpsNavigationModalProps {
  driver: Driver;
  ride?: Ride | null;
  onClose: () => void;
  onCompleteRide?: (completedRide?: Ride | null) => void;
  onCancelRide?: () => void;
  onOpenSupport?: () => void;
}

export const DriverGpsNavigationModal: React.FC<DriverGpsNavigationModalProps> = ({
  driver,
  ride,
  onClose,
  onCompleteRide,
  onCancelRide,
  onOpenSupport,
}) => {
  const mapContainerRef = useRef<HTMLDivElement>(null);
  const mapInstanceRef = useRef<L.Map | null>(null);
  const carMarkerRef = useRef<L.Marker | null>(null);
  const pickupMarkerRef = useRef<L.Marker | null>(null);
  const destMarkerRef = useRef<L.Marker | null>(null);
  const routePolylineBorderRef = useRef<L.Polyline | null>(null);
  const routePolylineRef = useRef<L.Polyline | null>(null);
  const nextLegPolylineRef = useRef<L.Polyline | null>(null);

  const stepRef = useRef(0);
  const hasInitialFitBoundsRef = useRef(false);
  const touchStartYRef = useRef<number | null>(null);

  const isMotoboy =
    driver.category === 'moto_passageiro' ||
    driver.category === 'moto_entrega' ||
    ride?.category === 'moto_passageiro' ||
    ride?.category === 'moto_entrega';

  // Dados completos da corrida aceita
  const effectiveRide: Ride = ride || {
    id: `RCE-${Math.floor(1000 + Math.random() * 9000)}`,
    passengerName: 'Marina Gonçalves de Castro',
    passengerPhone: '(19) 99887-1122',
    passengerAvatar:
      'https://images.unsplash.com/photo-1544005313-94ddf0286df2?w=150&auto=format&fit=crop&q=80',
    passengerRating: 5.0,
    driver,
    category: driver.category || 'economica',
    pickup: {
      address: 'Av. Presidente Vargas, 1250 - Centro, Indaiatuba - SP',
      lat: -23.0955,
      lng: -47.2250,
    },
    destination: {
      address: 'Av. dos Trabalhadores, 350 - Jardim América, Indaiatuba - SP',
      lat: -23.0805,
      lng: -47.2050,
    },
    distanceKm: 3.2,
    durationMinutes: 7,
    price: 28.5,
    driverEarnings: 24.23,
    platformFee: 4.27,
    paymentMethod: 'pix',
    paymentStatus: 'paid',
    status: 'in_progress',
    createdAt: new Date().toISOString(),
  };

  const startCarLat = driver.lat || -23.084087;
  const startCarLng = driver.lng || -47.212027;
  const pickupLat = effectiveRide.pickup?.lat || -23.0955;
  const pickupLng = effectiveRide.pickup?.lng || -47.2250;
  const destLat = effectiveRide.destination?.lat || -23.0805;
  const destLng = effectiveRide.destination?.lng || -47.2050;

  // Fases da corrida do motorista
  const [tripPhase, setTripPhase] = useState<DriverTripPhase>('to_pickup');

  // Card começa MINIMIZADO no Modo Navegação para não cobrir o mapa enquanto dirige (arrasta para cima para expandir)
  const [cardState, setCardState] = useState<CardSizeState>('minimized');
  const [isFollowingCar, setIsFollowingCar] = useState(true);
  const [showExternalNavMenu, setShowExternalNavMenu] = useState(false);

  const [pickupRoute, setPickupRoute] = useState<StreetRouteResult>({
    coordinates: INDAIATUBA_REAL_STREET_COORDINATES,
    steps: INDAIATUBA_REAL_STEPS,
    totalDistanceMeters: 1800,
    totalDurationSeconds: 240,
  });

  const [destRoute, setDestRoute] = useState<StreetRouteResult>({
    coordinates: [
      [pickupLat, pickupLng],
      [(pickupLat + destLat) / 2, (pickupLng + destLng) / 2],
      [destLat, destLng],
    ],
    steps: INDAIATUBA_REAL_STEPS,
    totalDistanceMeters: Math.round((effectiveRide.distanceKm || 3.2) * 1000),
    totalDurationSeconds: (effectiveRide.durationMinutes || 7) * 60,
  });

  const activeRoute = tripPhase === 'to_destination' ? destRoute : pickupRoute;

  const [currentStepIndex, setCurrentStepIndex] = useState(0);
  const [carHeading, setCarHeading] = useState(209);
  const [carPos, setCarPos] = useState<[number, number]>([startCarLat, startCarLng]);
  const [speedKmh, setSpeedKmh] = useState(42);
  const [distanceRemainingMeters, setDistanceRemainingMeters] = useState(1800);
  const [secondsRemaining, setSecondsRemaining] = useState(240);
  const [isVoiceMuted, setIsVoiceMuted] = useState<boolean>(() => !isAudioEnabled());
  const [showCancelProblemMenu, setShowCancelProblemMenu] = useState(false);
  const lastSpokenManeuverRef = useRef<string>('');

  // Confirmação por código de 4 números do passageiro
  const [fallbackRideCode] = useState<string>(() => generateUniqueRideConfirmationCode());
  const expectedConfirmationCode = effectiveRide.confirmationCode || fallbackRideCode;
  const [isCodeConfirmed, setIsCodeConfirmed] = useState(false);
  const [isCodeModalOpen, setIsCodeModalOpen] = useState(false);
  const [codeDigits, setCodeDigits] = useState<[string, string, string, string]>(['', '', '', '']);
  const codeInputRefs = useRef<(HTMLInputElement | null)[]>([null, null, null, null]);
  const [wrongAttempts, setWrongAttempts] = useState(0);
  const [lockedUntil, setLockedUntil] = useState<number | null>(null);
  const [secondsLeftToUnlock, setSecondsLeftToUnlock] = useState(0);
  const [codeError, setCodeError] = useState<string | null>(null);
  const [codeSuccessMessage, setCodeSuccessMessage] = useState<string | null>(null);
  const [showNoCodeOptions, setShowNoCodeOptions] = useState(false);

  useEffect(() => {
    if (!lockedUntil) {
      setSecondsLeftToUnlock(0);
      return;
    }
    const updateCountdown = () => {
      const remaining = Math.ceil((lockedUntil - Date.now()) / 1000);
      if (remaining <= 0) {
        setLockedUntil(null);
        setSecondsLeftToUnlock(0);
        setWrongAttempts(0);
        setCodeError(null);
      } else {
        setSecondsLeftToUnlock(remaining);
      }
    };
    updateCountdown();
    const timer = setInterval(updateCountdown, 1000);
    return () => clearInterval(timer);
  }, [lockedUntil]);

  // Busca as duas rotas reais pelas ruas de Indaiatuba via OSRM
  useEffect(() => {
    let isMounted = true;
    fetchRealStreetRoute(startCarLat, startCarLng, pickupLat, pickupLng).then((res) => {
      if (isMounted && res.coordinates.length > 0) {
        setPickupRoute(res);
        setDistanceRemainingMeters(res.totalDistanceMeters);
        setSecondsRemaining(res.totalDurationSeconds);
        setCarPos(res.coordinates[0]);
      }
    });

    fetchRealStreetRoute(pickupLat, pickupLng, destLat, destLng).then((res) => {
      if (isMounted && res.coordinates.length > 0) {
        setDestRoute(res);
      }
    });

    return () => {
      isMounted = false;
    };
  }, [startCarLat, startCarLng, pickupLat, pickupLng, destLat, destLng]);

  // 1. Inicializa Leaflet (z-index: 0) em Modo Navegação (zoom 17 centralizado no carro) com movimento livre ao arrastar
  useEffect(() => {
    if (!mapContainerRef.current) return;

    if (!mapInstanceRef.current) {
      const map = L.map(mapContainerRef.current, {
        center: [startCarLat, startCarLng],
        zoom: 17,
        minZoom: INDAIATUBA_MIN_ZOOM,
        maxZoom: INDAIATUBA_MAX_ZOOM,
        maxBounds: INDAIATUBA_BOUNDS,
        maxBoundsViscosity: 0.5,
        dragging: true,
        scrollWheelZoom: true,
        touchZoom: true,
        doubleClickZoom: true,
        zoomControl: false,
      });

      L.tileLayer('https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png', {
        attribution: '&copy; OpenStreetMap',
        maxZoom: 19,
      }).addTo(map);

      // Se o motorista arrastar o mapa manualmente, pausa auto-follow/rotação para deixar explorar livremente
      map.on('dragstart', () => {
        setIsFollowingCar(false);
      });

      mapInstanceRef.current = map;
      map.invalidateSize();
      const t1 = setTimeout(() => map.invalidateSize(), 150);
      const t2 = setTimeout(() => map.invalidateSize(), 400);

      return () => {
        clearTimeout(t1);
        clearTimeout(t2);
      };
    }

    return () => {
      if (mapInstanceRef.current) {
        mapInstanceRef.current.remove();
        mapInstanceRef.current = null;
      }
    };
  }, []);

  // Mantém o mapa centralizado no carro enquanto dirige (Modo Navegação ativo)
  useEffect(() => {
    const map = mapInstanceRef.current;
    if (!map || !isFollowingCar) return;
    map.panTo(carPos, { animate: true, duration: 0.75 });
  }, [carPos, isFollowingCar]);

  // 2. Atualiza rota em tempo real + pinos de coleta/destino + fitBounds inicial na área acima do card
  useEffect(() => {
    const map = mapInstanceRef.current;
    if (!map) return;

    const currentCoords = activeRoute.coordinates;
    const remainingCoords =
      stepRef.current < currentCoords.length - 1
        ? currentCoords.slice(stepRef.current)
        : currentCoords;

    if (routePolylineBorderRef.current) {
      routePolylineBorderRef.current.setLatLngs(remainingCoords);
    } else {
      routePolylineBorderRef.current = L.polyline(remainingCoords, {
        color: '#ffffff',
        weight: 10,
        opacity: 1,
        lineCap: 'round',
        lineJoin: 'round',
      }).addTo(map);
    }

    const activeLineColor = tripPhase === 'to_destination' ? '#10b981' : '#ff6a00';
    if (routePolylineRef.current) {
      routePolylineRef.current.setLatLngs(remainingCoords);
      routePolylineRef.current.setStyle({ color: activeLineColor });
    } else {
      routePolylineRef.current = L.polyline(remainingCoords, {
        color: activeLineColor,
        weight: 6,
        opacity: 1,
        lineCap: 'round',
        lineJoin: 'round',
      }).addTo(map);
    }

    if (tripPhase === 'to_pickup' || tripPhase === 'arrived_pickup') {
      if (nextLegPolylineRef.current) {
        nextLegPolylineRef.current.setLatLngs(destRoute.coordinates);
      } else {
        nextLegPolylineRef.current = L.polyline(destRoute.coordinates, {
          color: '#2563eb',
          weight: 5,
          dashArray: '8, 8',
          opacity: 0.75,
          lineCap: 'round',
        }).addTo(map);
      }
    } else if (nextLegPolylineRef.current) {
      nextLegPolylineRef.current.remove();
      nextLegPolylineRef.current = null;
    }

    // Pino do Passageiro (Coleta)
    const passengerPinHtml = `
      <div style="filter: drop-shadow(0 4px 6px rgba(0,0,0,0.35)); display: flex; flex-direction: column; align-items: center; transform: rotate(var(--nav-counter-rot, 0deg)); transition: transform 0.65s linear;">
        <svg width="30" height="38" viewBox="0 0 32 40" fill="none">
          <path d="M16 0C7.16 0 0 7.16 0 16C0 28 16 40 16 40C16 40 32 28 32 16C32 7.16 24.84 0 16 0Z" fill="#10b981" stroke="#ffffff" stroke-width="2.5"/>
          <path d="M16 8C13.8 8 12 9.8 12 12C12 14.2 13.8 16 16 16C18.2 16 20 14.2 20 12C20 9.8 18.2 8 16 8ZM16 18C13 18 10 19.5 10 22.5V24H22V22.5C22 19.5 19 18 16 18Z" fill="#ffffff" />
        </svg>
        <div style="background: #065f46; color: #ffffff; font-family: sans-serif; font-size: 10px; font-weight: 800; padding: 2px 7px; border-radius: 9999px; border: 1.5px solid #ffffff; margin-top: -2px; white-space: nowrap;">
          👤 ${effectiveRide.passengerName.split(' ')[0]} (Coleta)
        </div>
      </div>
    `;
    const passengerIcon = L.divIcon({
      className: 'driver-pickup-pin',
      html: passengerPinHtml,
      iconSize: [110, 48],
      iconAnchor: [55, 38],
    });
    if (pickupMarkerRef.current) {
      pickupMarkerRef.current.setLatLng([pickupLat, pickupLng]);
    } else {
      pickupMarkerRef.current = L.marker([pickupLat, pickupLng], { icon: passengerIcon }).addTo(map);
    }

    // Pino do Destino
    const destPinHtml = `
      <div style="filter: drop-shadow(0 4px 6px rgba(0,0,0,0.35)); display: flex; flex-direction: column; align-items: center; transform: rotate(var(--nav-counter-rot, 0deg)); transition: transform 0.65s linear;">
        <div style="background: #ff6a00; color: #ffffff; font-family: sans-serif; font-size: 10px; font-weight: 900; padding: 3px 8px; border-radius: 9999px; border: 2px solid #ffffff; white-space: nowrap;">
          🏁 Destino Final
        </div>
      </div>
    `;
    const destIcon = L.divIcon({
      className: 'driver-dest-pin',
      html: destPinHtml,
      iconSize: [96, 28],
      iconAnchor: [48, 14],
    });
    if (destMarkerRef.current) {
      destMarkerRef.current.setLatLng([destLat, destLng]);
    } else {
      destMarkerRef.current = L.marker([destLat, destLng], { icon: destIcon }).addTo(map);
    }

    // Centraliza no carro em zoom de navegação ao abrir pela 1ª vez
    if (!hasInitialFitBoundsRef.current) {
      hasInitialFitBoundsRef.current = true;
      map.setView([startCarLat, startCarLng], 17, { animate: false });
    }
  }, [activeRoute, pickupRoute, destRoute, tripPhase, currentStepIndex, pickupLat, pickupLng, destLat, destLng, startCarLat, startCarLng, effectiveRide.passengerName]);

  // 3. Marcador do veículo REAL (sem bolinha) em movimento — compensa rotação do mapa quando em Modo Navegação
  useEffect(() => {
    const map = mapInstanceRef.current;
    if (!map) return;

    const svgRotation = isFollowingCar ? 0 : carHeading;
    const badgeCounterRotation = isFollowingCar ? carHeading : 0;

    const vehicleHtml = isMotoboy
      ? `
      <div style="display: flex; flex-direction: column; align-items: center;">
        <div style="width: 52px; height: 52px; display: flex; align-items: center; justify-content: center; transform: rotate(${svgRotation}deg); transition: transform 0.45s cubic-bezier(0.4, 0, 0.2, 1); filter: drop-shadow(0 6px 8px rgba(0,0,0,0.45));">
          <svg width="52" height="52" viewBox="0 0 48 48" fill="none" xmlns="http://www.w3.org/2000/svg">
            <rect x="22" y="3" width="4" height="9" rx="2" fill="#18181b" stroke="#ffffff" stroke-width="0.8" />
            <line x1="12" y1="12" x2="36" y2="12" stroke="#ffffff" stroke-width="2.5" stroke-linecap="round" />
            <rect x="10" y="10.5" width="4" height="3" rx="1.5" fill="#ff6a00" />
            <rect x="34" y="10.5" width="4" height="3" rx="1.5" fill="#ff6a00" />
            <ellipse cx="24" cy="5" rx="2.5" ry="1.5" fill="#ffffff" />
            <path d="M21 14C21 13 22 12.5 24 12.5C26 12.5 27 13 27 14L28 20C28 21 26.5 22 24 22C21.5 22 20 21 20 20L21 14Z" fill="#ff6a00" stroke="#ffffff" stroke-width="1" />
            <circle cx="24" cy="25" r="5" fill="#18181b" stroke="#ffffff" stroke-width="1.2" />
            <path d="M21.5 22.5C22.5 21.8 25.5 21.8 26.5 22.5" stroke="#ff6a00" stroke-width="2" stroke-linecap="round" />
            <rect x="21" y="29" width="6" height="8" rx="3" fill="#27272a" />
            <rect x="22" y="36" width="4" height="9" rx="2" fill="#18181b" stroke="#ffffff" stroke-width="0.8" />
            <rect x="26.5" y="33" width="2" height="7" rx="1" fill="#71717a" />
            <rect x="22.5" y="44" width="3" height="1.5" rx="0.75" fill="#ef4444" />
          </svg>
        </div>
        <div style="transform: rotate(${badgeCounterRotation}deg); transition: transform 0.6s linear; background: #09090b; color: #ff6a00; font-family: monospace; font-size: 10px; font-weight: 900; padding: 2px 7px; border-radius: 9999px; border: 1.5px solid #ffffff; margin-top: 2px; box-shadow: 0 4px 6px rgba(0,0,0,0.3); white-space: nowrap;">
          ${driver.vehiclePlate || 'RACE-2026'} • ${speedKmh} km/h
        </div>
      </div>
      `
      : `
      <div style="display: flex; flex-direction: column; align-items: center;">
        <div style="width: 52px; height: 52px; display: flex; align-items: center; justify-content: center; transform: rotate(${svgRotation}deg); transition: transform 0.45s cubic-bezier(0.4, 0, 0.2, 1); filter: drop-shadow(0 6px 8px rgba(0,0,0,0.45));">
          <svg width="52" height="52" viewBox="0 0 48 48" fill="none" xmlns="http://www.w3.org/2000/svg">
            <rect x="7" y="10" width="4" height="8" rx="2" fill="#18181b" />
            <rect x="37" y="10" width="4" height="8" rx="2" fill="#18181b" />
            <rect x="7" y="30" width="4" height="8" rx="2" fill="#18181b" />
            <rect x="37" y="30" width="4" height="8" rx="2" fill="#18181b" />
            <rect x="6" y="15" width="4" height="3" rx="1.5" fill="#e05e00" stroke="#ffffff" stroke-width="0.8" />
            <rect x="38" y="15" width="4" height="3" rx="1.5" fill="#e05e00" stroke="#ffffff" stroke-width="0.8" />
            <path d="M14 12C14 7 17 4 24 4C31 4 34 7 34 12V36C34 41 31 44 24 44C17 44 14 41 14 36V12Z" fill="#ff6a00" stroke="#ffffff" stroke-width="1.8" />
            <path d="M17 5.5C19 4.8 22 4.5 24 4.5C26 4.5 29 4.8 31 5.5" stroke="#ffe4d6" stroke-width="1" stroke-linecap="round" />
            <ellipse cx="16.5" cy="6.5" rx="2" ry="1.2" fill="#ffffff" />
            <ellipse cx="31.5" cy="6.5" rx="2" ry="1.2" fill="#ffffff" />
            <path d="M16 14C17 12 20 11 24 11C28 11 31 12 32 14L31 18H17L16 14Z" fill="#09090b" stroke="#3f3f46" stroke-width="0.8" />
            <rect x="17.5" y="19" width="13" height="12" rx="2" fill="#e05e00" />
            <rect x="19" y="21" width="10" height="7" rx="1.5" fill="#18181b" opacity="0.85" />
            <path d="M17 32H31L32 35C31 36.5 28 37 24 37C20 37 17 36.5 16 35L17 32Z" fill="#09090b" stroke="#3f3f46" stroke-width="0.8" />
            <rect x="15.5" y="42" width="4.5" height="1.8" rx="0.9" fill="#ef4444" />
            <rect x="28" y="42" width="4.5" height="1.8" rx="0.9" fill="#ef4444" />
          </svg>
        </div>
        <div style="transform: rotate(${badgeCounterRotation}deg); transition: transform 0.6s linear; background: #09090b; color: #ff6a00; font-family: monospace; font-size: 10px; font-weight: 900; padding: 2px 7px; border-radius: 9999px; border: 1.5px solid #ffffff; margin-top: 2px; box-shadow: 0 4px 6px rgba(0,0,0,0.3); white-space: nowrap;">
          ${driver.vehiclePlate || 'RACE-2026'} • ${speedKmh} km/h
        </div>
      </div>
      `;

    const carIcon = L.divIcon({
      className: 'gps-driver-car',
      html: vehicleHtml,
      iconSize: [52, 66],
      iconAnchor: [26, 26],
    });

    if (carMarkerRef.current) {
      carMarkerRef.current.setLatLng(carPos);
      carMarkerRef.current.setIcon(carIcon);
    } else {
      carMarkerRef.current = L.marker(carPos, { icon: carIcon }).addTo(map);
    }
  }, [carPos, carHeading, speedKmh, driver.vehiclePlate, isMotoboy, isFollowingCar]);

  // 4. Simulação de condução pelas ruas em tempo real
  useEffect(() => {
    if (tripPhase === 'arrived_pickup' || tripPhase === 'completed') return;

    const coords = activeRoute.coordinates;
    if (coords.length < 2) return;

    const interval = setInterval(() => {
      const prev = stepRef.current;
      const next = prev + 1;

      if (next >= coords.length) {
        stepRef.current = coords.length - 1;
        setDistanceRemainingMeters(0);
        setSecondsRemaining(0);
        setSpeedKmh(0);
        if (tripPhase === 'to_pickup') {
          setTripPhase('arrived_pickup');
        }
        clearInterval(interval);
        return;
      }

      stepRef.current = next;
      setCurrentStepIndex(next);

      const currentPoint = coords[prev];
      const nextPoint = coords[next];
      setCarPos(nextPoint);

      const heading = calculateBearing(currentPoint[0], currentPoint[1], nextPoint[0], nextPoint[1]);
      setCarHeading(heading);

      const isCornerTurn = Math.abs(heading - carHeading) > 30;
      const targetSpeed = isCornerTurn ? 22 : Math.floor(40 + Math.random() * 8);
      setSpeedKmh(targetSpeed);

      const pct = (coords.length - 1 - next) / (coords.length - 1);
      setDistanceRemainingMeters(Math.max(Math.round(pct * activeRoute.totalDistanceMeters), 0));
      setSecondsRemaining(Math.max(Math.round(pct * activeRoute.totalDurationSeconds), 0));
    }, 1000);

    return () => clearInterval(interval);
  }, [activeRoute, carHeading, tripPhase]);

  // Ações da Corrida do Motorista
  const handleOpenCodeModal = () => {
    setShowNoCodeOptions(false);
    setIsCodeModalOpen(true);
    setTimeout(() => {
      codeInputRefs.current[0]?.focus();
    }, 80);
  };

  const handleArrivedAtPickup = () => {
    setTripPhase('arrived_pickup');
    const pickupPoint: [number, number] = [pickupLat, pickupLng];
    setCarPos(pickupPoint);
    setSpeedKmh(0);
    setDistanceRemainingMeters(0);
    setSecondsRemaining(0);
    if (!isCodeConfirmed) {
      handleOpenCodeModal();
    }
  };

  const handleDigitChange = (index: number, rawValue: string) => {
    if (lockedUntil && Date.now() < lockedUntil) return;
    const onlyNums = rawValue.replace(/\D/g, '');
    if (onlyNums.length > 1) {
      // Suporta colar os 4 números de uma vez
      const chars = onlyNums.slice(0, 4).split('');
      const next: [string, string, string, string] = [
        chars[0] || '',
        chars[1] || '',
        chars[2] || '',
        chars[3] || '',
      ];
      setCodeDigits(next);
      setCodeError(null);
      const focusIdx = Math.min(chars.length, 3);
      codeInputRefs.current[focusIdx]?.focus();
      return;
    }

    const next: [string, string, string, string] = [...codeDigits] as [string, string, string, string];
    next[index] = onlyNums;
    setCodeDigits(next);
    setCodeError(null);

    if (onlyNums && index < 3) {
      codeInputRefs.current[index + 1]?.focus();
    }
  };

  const handleDigitKeyDown = (index: number, e: React.KeyboardEvent<HTMLInputElement>) => {
    if (e.key === 'Backspace' && !codeDigits[index] && index > 0) {
      codeInputRefs.current[index - 1]?.focus();
    }
  };

  const handleKeypadPress = (num: string) => {
    if (lockedUntil && Date.now() < lockedUntil) return;
    const emptyIdx = codeDigits.findIndex((d) => !d);
    if (emptyIdx === -1) return;
    const next: [string, string, string, string] = [...codeDigits] as [string, string, string, string];
    next[emptyIdx] = num;
    setCodeDigits(next);
    setCodeError(null);
    if (emptyIdx < 3) {
      codeInputRefs.current[emptyIdx + 1]?.focus();
    }
  };

  const handleKeypadBackspace = () => {
    if (lockedUntil && Date.now() < lockedUntil) return;
    let lastFilled = -1;
    for (let i = 3; i >= 0; i--) {
      if (codeDigits[i]) {
        lastFilled = i;
        break;
      }
    }
    if (lastFilled === -1) return;
    const next: [string, string, string, string] = [...codeDigits] as [string, string, string, string];
    next[lastFilled] = '';
    setCodeDigits(next);
    codeInputRefs.current[lastFilled]?.focus();
  };

  const handleConfirmCode = () => {
    if (lockedUntil && Date.now() < lockedUntil) {
      setCodeError('Aguarde 1 minuto para tentar novamente');
      return;
    }

    const entered = codeDigits.join('');
    if (entered.length < 4) {
      setCodeError('Digite os 4 números do código do passageiro.');
      return;
    }

    if (entered === expectedConfirmationCode) {
      setIsCodeConfirmed(true);
      setCodeError(null);
      setCodeSuccessMessage('Passageiro confirmado!');
      setWrongAttempts(0);
      setIsCodeModalOpen(false);
      setTripPhase('arrived_pickup');
      if (!isVoiceMuted) {
        speakNavigationInstruction('Passageiro confirmado. Toque em iniciar corrida.');
      }
      return;
    }

    const nextWrong = wrongAttempts + 1;
    setCodeDigits(['', '', '', '']);
    setTimeout(() => {
      codeInputRefs.current[0]?.focus();
    }, 50);

    if (nextWrong >= 3) {
      setWrongAttempts(nextWrong);
      setLockedUntil(Date.now() + 60000);
      setCodeError('Aguarde 1 minuto para tentar novamente');
    } else {
      setWrongAttempts(nextWrong);
      setCodeError('Código incorreto, peça novamente para o passageiro');
    }
  };

  const handleStartTripToDestination = () => {
    if (!isCodeConfirmed) {
      handleOpenCodeModal();
      return;
    }
    setTripPhase('to_destination');
    setIsFollowingCar(true);
    setCardState('minimized');
    stepRef.current = 0;
    setCurrentStepIndex(0);
    const startPt = destRoute.coordinates[0] || [pickupLat, pickupLng];
    setCarPos(startPt);
    setDistanceRemainingMeters(destRoute.totalDistanceMeters);
    setSecondsRemaining(destRoute.totalDurationSeconds);

    if (!isVoiceMuted) {
      speakNavigationInstruction('Corrida iniciada. Siga para o destino.');
    }

    if (mapInstanceRef.current) {
      mapInstanceRef.current.setView(startPt, 17, { animate: true });
    }
  };

  const handleFinishRide = () => {
    setTripPhase('completed');
    if (onCompleteRide) {
      onCompleteRide(effectiveRide);
    }
    onClose();
  };

  const handleCenterRoute = () => {
    if (!mapInstanceRef.current) return;
    setIsFollowingCar(false);
    const bounds = L.latLngBounds([carPos, [pickupLat, pickupLng], [destLat, destLng]]);
    mapInstanceRef.current.fitBounds(bounds, {
      paddingTopLeft: [40, 180],
      paddingBottomRight: [40, 220],
      animate: true,
    });
  };

  const handleFollowCar = () => {
    setIsFollowingCar(true);
    if (mapInstanceRef.current) {
      mapInstanceRef.current.setView(carPos, 17, { animate: true });
    }
  };

  const handleToggleVoice = () => {
    const nextMuted = !isVoiceMuted;
    setIsVoiceMuted(nextMuted);
    setAudioEnabled(!nextMuted);
    if (nextMuted) {
      if (typeof window !== 'undefined' && 'speechSynthesis' in window) {
        try {
          window.speechSynthesis.cancel();
        } catch {}
      }
    } else {
      speakNavigationInstruction('Navegação por voz ativada');
    }
  };

  // Gesto de arraste na barra superior do card entre os 3 estados (minimized -> medium -> expanded)
  const handleCardTouchStart = (e: React.TouchEvent) => {
    touchStartYRef.current = e.touches[0].clientY;
  };
  const handleCardTouchEnd = (e: React.TouchEvent) => {
    if (touchStartYRef.current === null) return;
    const deltaY = e.changedTouches[0].clientY - touchStartYRef.current;
    if (deltaY < -30) {
      setCardState((prev) => (prev === 'minimized' ? 'medium' : 'expanded'));
    } else if (deltaY > 30) {
      setCardState((prev) => (prev === 'expanded' ? 'medium' : 'minimized'));
    }
    touchStartYRef.current = null;
  };

  const steps = activeRoute.steps;
  const currentManeuver = (() => {
    if (tripPhase === 'arrived_pickup') {
      return {
        headline: 'CHEGOU AO EMBARQUE',
        street: effectiveRide.pickup.address,
        spoken: 'Você chegou ao local de embarque. Peça o código do passageiro.',
        modifier: 'arrive',
      };
    }
    if (tripPhase === 'completed') {
      return {
        headline: 'DESTINO ALCANÇADO',
        street: effectiveRide.destination.address,
        spoken: 'Você chegou ao destino final.',
        modifier: 'arrive',
      };
    }

    const totalCoords = Math.max(activeRoute.coordinates.length, 1);
    const stepIdx = Math.min(Math.floor((currentStepIndex / totalCoords) * steps.length), steps.length - 1);
    const active = steps[stepIdx] || steps[0];
    const nextStep = steps[Math.min(stepIdx + 1, steps.length - 1)] || active;
    const progressInStep = ((currentStepIndex / totalCoords) * steps.length) % 1;
    const rawMeters = Math.max(50, Math.round((active.distanceMeters || 300) * (1 - progressInStep) / 50) * 50);
    const distLabel = rawMeters >= 1000 ? `${(rawMeters / 1000).toFixed(1).replace('.', ',')} km` : `${rawMeters}m`;
    const distSpoken = rawMeters >= 1000 ? `${(rawMeters / 1000).toFixed(1).replace('.', ',')} quilômetros` : `${rawMeters} metros`;

    let actionVerb = 'SIGA EM FRENTE';
    let spokenVerb = 'Siga em frente';
    if (nextStep.modifier === 'right' || nextStep.modifier === 'sharp right') {
      actionVerb = 'VIRE À DIREITA';
      spokenVerb = 'Vire à direita';
    } else if (nextStep.modifier === 'left' || nextStep.modifier === 'sharp left') {
      actionVerb = 'VIRE À ESQUERDA';
      spokenVerb = 'Vire à esquerda';
    } else if (nextStep.modifier === 'slight right') {
      actionVerb = 'ENTRE À DIREITA';
      spokenVerb = 'Entre suavemente à direita';
    } else if (nextStep.modifier === 'slight left') {
      actionVerb = 'ENTRE À ESQUERDA';
      spokenVerb = 'Entre suavemente à esquerda';
    }

    const targetStreet = nextStep.streetName || active.streetName || 'Via local';
    return {
      headline: `${actionVerb} EM ${distLabel} - ${targetStreet}`,
      street: targetStreet,
      spoken: `${spokenVerb} em ${distSpoken} na ${targetStreet}`,
      modifier: nextStep.modifier || active.modifier || 'straight',
    };
  })();

  // Fala automaticamente cada nova manobra em voz alta enquanto dirige
  useEffect(() => {
    if (isVoiceMuted) return;
    const key = `${tripPhase}:${currentManeuver.street}:${currentManeuver.modifier}`;
    if (lastSpokenManeuverRef.current === key) return;
    lastSpokenManeuverRef.current = key;
    speakNavigationInstruction(currentManeuver.spoken);
  }, [tripPhase, currentManeuver.street, currentManeuver.modifier, currentManeuver.spoken, isVoiceMuted]);

  const minutesLeft = Math.max(Math.ceil(secondsRemaining / 60), 1);
  const kmLeftFormatted = (distanceRemainingMeters / 1000).toFixed(1).replace('.', ',');
  const totalValue = effectiveRide.price || 28.5;
  const driverNetValue = Number((totalValue * 0.85).toFixed(2));
  const raceCommissionValue = Number((totalValue * 0.15).toFixed(2));
  const cleanPhone = (effectiveRide.passengerPhone || '19998871122').replace(/\D/g, '');
  const activeTargetAddress =
    tripPhase === 'to_destination' ? effectiveRide.destination.address : effectiveRide.pickup.address;

  const paymentLabel =
    effectiveRide.paymentMethod === 'credit_card'
      ? 'Cartão no App'
      : effectiveRide.paymentMethod === 'money'
      ? 'Dinheiro ao Motorista'
      : 'PIX no App';

  const activeTargetLat = tripPhase === 'to_destination' ? destLat : pickupLat;
  const activeTargetLng = tripPhase === 'to_destination' ? destLng : pickupLng;
  const externalNavUrl = `https://www.google.com/maps/dir/?api=1&destination=${activeTargetLat},${activeTargetLng}&travelmode=driving`;
  const wazeNavUrl = `https://waze.com/ul?ll=${activeTargetLat},${activeTargetLng}&navigate=yes`;

  const statusText =
    tripPhase === 'completed'
      ? 'CORRIDA FINALIZADA'
      : isCodeConfirmed
      ? tripPhase === 'to_destination'
        ? 'CORRIDA INICIADA • EM ROTA'
        : 'CÓDIGO OK • PODE INICIAR'
      : tripPhase === 'arrived_pickup'
      ? 'NO LOCAL • DIGITE O CÓDIGO'
      : 'MODO NAVEGAÇÃO • A CAMINHO';

  const statusBadgeColor =
    tripPhase === 'to_destination' || isCodeConfirmed
      ? 'bg-emerald-600 text-white border-emerald-400'
      : tripPhase === 'arrived_pickup'
      ? 'bg-blue-600 text-white border-blue-400'
      : 'bg-[#ff6a00] text-white border-[#ff8533]';

  // Alturas exatas dos 3 estados (minimized compacto para nunca cobrir o mapa enquanto dirige; medium 55%; expanded 88%)
  const cardHeightStyle: React.CSSProperties =
    cardState === 'minimized'
      ? { minHeight: '196px', maxHeight: '220px' }
      : cardState === 'medium'
      ? { height: '55%' }
      : { height: '88%' };

  return (
    /* Container termina 20px acima da barra inferior (BottomNav z-40) para nunca ficar atrás dela */
    <div className="fixed top-0 left-0 right-0 bottom-[calc(104px+env(safe-area-inset-bottom,0px))] sm:bottom-[calc(120px+env(safe-area-inset-bottom,0px))] z-50 bg-slate-950 text-white select-none">
      {/* 1. MAPA GRANDE NO FUNDO COM z-index: 0 E ROTAÇÃO AUTOMÁTICA SEGUINDO O CARRO */}
      <div className="absolute inset-0 z-0 overflow-hidden bg-slate-200">
        <div
          ref={mapContainerRef}
          style={
            {
              transform: `rotate(${isFollowingCar ? -carHeading : 0}deg) scale(${isFollowingCar ? 1.42 : 1})`,
              transition: 'transform 0.65s linear',
              '--nav-counter-rot': `${isFollowingCar ? carHeading : 0}deg`,
            } as React.CSSProperties
          }
          className="w-full h-full bg-white"
        />
      </div>

      {/* 2. MODO NAVEGAÇÃO HUD NO TOPO (LIMPO, FONTE GIGANTE, VOZ ON/OFF, TEMPO E DISTÂNCIA) */}
      <div className="absolute top-2 left-2 right-2 z-20 pointer-events-none space-y-2">
        {/* Linha Principal: Seta Gigante + Próxima Manobra Grande + Botão de Voz + Velocímetro */}
        <div className="bg-emerald-700/95 backdrop-blur-md text-white rounded-2xl p-3 shadow-2xl border-2 border-emerald-400 flex items-center justify-between gap-2.5 pointer-events-auto">
          <div className="flex items-center gap-3 min-w-0 flex-1">
            <div className="w-14 h-14 rounded-2xl bg-slate-950 text-emerald-400 flex items-center justify-center shrink-0 border-2 border-emerald-400 shadow-lg">
              {currentManeuver.modifier === 'right' ||
              currentManeuver.modifier === 'sharp right' ||
              currentManeuver.modifier === 'slight right' ? (
                <CornerUpRight className="w-9 h-9 stroke-[3]" />
              ) : currentManeuver.modifier === 'left' ||
                currentManeuver.modifier === 'sharp left' ||
                currentManeuver.modifier === 'slight left' ? (
                <CornerUpLeft className="w-9 h-9 stroke-[3]" />
              ) : (
                <ArrowUp className="w-9 h-9 stroke-[3]" />
              )}
            </div>
            <div className="min-w-0 flex-1">
              <span className="text-[10px] font-mono font-black uppercase tracking-widest text-emerald-200 block">
                Próxima Manobra
              </span>
              <h2 className="font-heading font-black text-lg sm:text-2xl leading-tight text-white line-clamp-2">
                {currentManeuver.headline}
              </h2>
            </div>
          </div>

          <div className="flex items-center gap-2 shrink-0">
            {/* Botão de Som Ligado / Desligado bem visível */}
            <button
              type="button"
              onClick={handleToggleVoice}
              className={`h-12 px-3 rounded-2xl border-2 font-heading font-black text-xs flex flex-col items-center justify-center shadow-lg cursor-pointer active:scale-95 ${
                isVoiceMuted
                  ? 'bg-rose-950 border-rose-400 text-rose-200'
                  : 'bg-slate-950 border-emerald-400 text-emerald-300'
              }`}
              title="Ligar ou desligar navegação por voz"
            >
              {isVoiceMuted ? (
                <VolumeX className="w-5 h-5 text-rose-400" />
              ) : (
                <Volume2 className="w-5 h-5 text-emerald-400 animate-pulse" />
              )}
              <span className="text-[9px] uppercase tracking-wider mt-0.5">
                {isVoiceMuted ? 'MUDO' : 'VOZ ON'}
              </span>
            </button>

            <div className="w-12 h-12 rounded-2xl bg-black/95 border-2 border-white flex flex-col items-center justify-center shrink-0">
              <span className="font-heading font-black text-white text-base leading-none">
                {speedKmh}
              </span>
              <span className="text-[8px] font-mono text-zinc-400 uppercase">km/h</span>
            </div>
          </div>
        </div>

        {/* Cartão de Relance: Endereço Gigante 24px + Tempo e Distância Grandes ("8 min - 3,2 km") */}
        <div className="bg-slate-950/92 backdrop-blur-md text-white rounded-2xl px-3.5 py-2.5 shadow-xl border border-zinc-700 pointer-events-auto flex flex-col sm:flex-row sm:items-center justify-between gap-2">
          <div className="min-w-0 flex-1">
            <span className="text-[10px] font-mono font-black uppercase tracking-wider text-amber-400 block">
              {tripPhase === 'to_destination' ? '🏁 DESTINO DO PASSAGEIRO' : '📍 COLETA DO PASSAGEIRO'}
            </span>
            <p
              style={{ fontSize: '24px', lineHeight: '1.15' }}
              className="font-heading font-black text-white line-clamp-2 break-words"
            >
              {activeTargetAddress}
            </p>
          </div>

          <div className="flex items-center justify-between sm:justify-end gap-2 shrink-0 border-t sm:border-t-0 border-zinc-800 pt-1.5 sm:pt-0">
            <div className="bg-[#ff6a00] text-white px-3.5 py-1.5 rounded-xl font-heading font-black text-lg sm:text-2xl tracking-tight shadow-md whitespace-nowrap">
              {minutesLeft} min - {kmLeftFormatted} km
            </div>

            {!isFollowingCar && (
              <button
                type="button"
                onClick={handleFollowCar}
                className="px-3 py-2 bg-blue-600 hover:bg-blue-500 text-white rounded-xl font-heading font-black text-xs flex items-center gap-1.5 shadow-lg cursor-pointer active:scale-95 border border-blue-400"
                title="Voltar a centralizar e girar com o carro"
              >
                <Crosshair className="w-4 h-4" />
                <span>SEGUIR</span>
              </button>
            )}

            <button
              type="button"
              onClick={handleCenterRoute}
              className="w-10 h-10 bg-zinc-800 hover:bg-zinc-700 border border-zinc-600 text-white rounded-xl flex items-center justify-center cursor-pointer active:scale-95"
              title="Ver rota completa"
            >
              <Route className="w-5 h-5" />
            </button>

            <button
              type="button"
              onClick={onClose}
              className="w-10 h-10 bg-zinc-900 hover:bg-zinc-800 border border-zinc-700 text-zinc-200 rounded-xl flex items-center justify-center cursor-pointer active:scale-95"
              title="Sair do modo navegação"
            >
              <ArrowLeft className="w-5 h-5" />
            </button>
          </div>
        </div>
      </div>

      {/* 3. CARD DO MOTORISTA COM z-index: 50 SEMPRE POR CIMA DO MAPA, INICIA MINIMIZADO PARA NÃO COBRIR O MAPA */}
      <div
        style={cardHeightStyle}
        className="absolute bottom-0 left-0 right-0 z-50 bg-white text-slate-950 border-t-4 border-[#ff6a00] rounded-t-3xl shadow-[0_-12px_40px_rgba(0,0,0,0.45)] flex flex-col transition-[height] duration-200 ease-out"
      >
        {/* Alça + Cabeçalho de Controle dos 3 Estados */}
        <div
          onTouchStart={handleCardTouchStart}
          onTouchEnd={handleCardTouchEnd}
          className="px-3.5 pt-2 pb-1.5 flex flex-col items-center gap-1 border-b border-slate-200 bg-white rounded-t-3xl shrink-0"
        >
          <div
            onClick={() =>
              setCardState((prev) =>
                prev === 'minimized' ? 'medium' : prev === 'medium' ? 'expanded' : 'minimized'
              )
            }
            className="w-14 h-1.5 rounded-full bg-slate-300 cursor-pointer"
            title="Arraste para cima para ver tudo"
          />

          <div className="w-full flex items-center justify-between gap-2">
            {/* Status Grande */}
            <div
              className={`px-2.5 py-1 rounded-xl border font-heading font-black text-[11px] sm:text-xs tracking-wider uppercase flex items-center gap-1.5 shadow-xs ${statusBadgeColor}`}
            >
              <span className="w-2 h-2 rounded-full bg-white animate-ping shrink-0" />
              <span className="truncate">{statusText}</span>
            </div>

            {/* Botões explícitos no cabeçalho: DIGITAR CÓDIGO + EXPANDIR / MINIMIZAR */}
            <div className="flex items-center gap-1.5 shrink-0 flex-wrap justify-end">
              {!isCodeConfirmed && (
                <button
                  type="button"
                  onClick={handleOpenCodeModal}
                  className="px-2.5 py-1.5 rounded-lg bg-blue-600 hover:bg-blue-500 text-white font-heading font-black text-[11px] flex items-center gap-1 cursor-pointer shadow-sm animate-pulse"
                >
                  <KeyRound className="w-3.5 h-3.5 shrink-0" />
                  <span>DIGITAR CÓDIGO</span>
                </button>
              )}
              {cardState !== 'minimized' && (
                <button
                  type="button"
                  onClick={() => setCardState('minimized')}
                  className="px-2.5 py-1 rounded-lg bg-slate-100 hover:bg-slate-200 text-slate-700 font-heading font-bold text-[11px] flex items-center gap-1 cursor-pointer border border-slate-300"
                >
                  <ChevronDown className="w-3.5 h-3.5" />
                  <span>Minimizar</span>
                </button>
              )}
              {cardState !== 'expanded' && (
                <button
                  type="button"
                  onClick={() =>
                    setCardState((prev) => (prev === 'minimized' ? 'medium' : 'expanded'))
                  }
                  className="px-2.5 py-1 rounded-lg bg-[#ff6a00] hover:bg-[#e05e00] text-white font-heading font-black text-[11px] flex items-center gap-1 cursor-pointer shadow-xs"
                >
                  <ChevronUp className="w-3.5 h-3.5" />
                  <span>EXPANDIR</span>
                </button>
              )}
            </div>
          </div>
        </div>

        {/* ESTADO 1: MINIMIZADO ENQUANTO DIRIGE (Passageiro + Valor + Código + Botões Gigantes CHEGUEI / INICIAR + Segurança) */}
        {cardState === 'minimized' ? (
          <div className="px-3 py-2 flex-1 flex flex-col justify-between gap-2 bg-white">
            {/* Passageiro + Valor + Código */}
            <div className="flex items-center justify-between gap-2">
              <div className="flex items-center gap-2 min-w-0">
                <img
                  src={
                    effectiveRide.passengerAvatar ||
                    'https://images.unsplash.com/photo-1544005313-94ddf0286df2?w=150&auto=format&fit=crop&q=80'
                  }
                  alt={effectiveRide.passengerName}
                  className="w-9 h-9 rounded-full object-cover border-2 border-[#ff6a00] shrink-0"
                />
                <div className="min-w-0">
                  <h3 className="font-heading font-black text-xs sm:text-sm text-slate-950 truncate">
                    {effectiveRide.passengerName} • ★ {(effectiveRide.passengerRating || 5.0).toFixed(1)}
                  </h3>
                  <span className="text-[11px] font-bold text-slate-600 block truncate">
                    {isCodeConfirmed ? '✅ Código confirmado' : '🔐 Código de 4 números pendente'}
                  </span>
                </div>
              </div>

              <div className="text-right shrink-0">
                <span className="font-heading font-black text-sm text-[#ff6a00] block leading-tight">
                  {formatBRL(totalValue)}
                </span>
                <span className="text-[10px] font-bold text-emerald-700 block">
                  Você (85%): {formatBRL(driverNetValue)}
                </span>
              </div>
            </div>

            {/* BOTÕES GIGANTES DE DIREÇÃO: VERDE CHEGUEI / FINALIZAR + AZUL INICIAR CORRIDA */}
            <div className="grid grid-cols-2 gap-2">
              {tripPhase !== 'to_destination' ? (
                <button
                  type="button"
                  onClick={handleArrivedAtPickup}
                  className="min-h-[54px] px-3 py-2.5 bg-emerald-600 hover:bg-emerald-500 active:scale-95 text-white rounded-2xl font-heading font-black text-base uppercase flex items-center justify-center gap-2 shadow-lg cursor-pointer border-2 border-emerald-400"
                >
                  <CheckCircle2 className="w-6 h-6 shrink-0" />
                  <span>CHEGUEI</span>
                </button>
              ) : (
                <button
                  type="button"
                  onClick={handleFinishRide}
                  className="min-h-[54px] px-3 py-2.5 bg-emerald-600 hover:bg-emerald-500 active:scale-95 text-white rounded-2xl font-heading font-black text-sm sm:text-base uppercase flex items-center justify-center gap-2 shadow-lg cursor-pointer border-2 border-emerald-400"
                >
                  <CheckCircle2 className="w-6 h-6 shrink-0" />
                  <span>FINALIZAR</span>
                </button>
              )}

              {!isCodeConfirmed ? (
                <button
                  type="button"
                  onClick={handleOpenCodeModal}
                  className="min-h-[54px] px-3 py-2.5 bg-slate-300 hover:bg-slate-400/70 text-slate-700 rounded-2xl font-heading font-black text-xs sm:text-sm uppercase flex flex-col items-center justify-center leading-tight border-2 border-slate-400 cursor-pointer"
                  title="Digite o código de 4 números para desbloquear INICIAR CORRIDA"
                >
                  <span className="flex items-center gap-1">
                    <Lock className="w-4 h-4 shrink-0" />
                    <span>INICIAR CORRIDA</span>
                  </span>
                  <span className="text-[10px] font-bold text-blue-700">Toque p/ código</span>
                </button>
              ) : (
                <button
                  type="button"
                  onClick={handleStartTripToDestination}
                  disabled={tripPhase === 'to_destination'}
                  className={`min-h-[54px] px-3 py-2.5 rounded-2xl font-heading font-black text-sm sm:text-base uppercase flex items-center justify-center gap-2 shadow-lg border-2 ${
                    tripPhase === 'to_destination'
                      ? 'bg-blue-100 text-blue-900 border-blue-500 cursor-default'
                      : 'bg-blue-600 hover:bg-blue-500 active:scale-95 text-white border-blue-400 cursor-pointer'
                  }`}
                >
                  <Play className="w-5 h-5 shrink-0 fill-current" />
                  <span>{tripPhase === 'to_destination' ? 'EM ROTA' : 'INICIAR CORRIDA'}</span>
                </button>
              )}
            </div>

            {/* BARRA FIXA DE SEGURANÇA E NAVEGAÇÃO EXTERNA */}
            <div className="grid grid-cols-3 gap-1.5">
              <button
                type="button"
                onClick={() => setShowExternalNavMenu(true)}
                className="min-h-[42px] px-2 py-1.5 bg-slate-900 hover:bg-slate-800 text-white rounded-xl font-heading font-black text-[10px] sm:text-xs uppercase flex items-center justify-center gap-1 cursor-pointer shadow-sm leading-tight text-center"
              >
                <Navigation className="w-3.5 h-3.5 text-emerald-400 shrink-0" />
                <span>GOOGLE MAPS / WAZE</span>
              </button>

              <a
                href={`tel:+55${cleanPhone}`}
                className="min-h-[42px] px-2 py-1.5 bg-blue-900 hover:bg-blue-800 text-white rounded-xl font-heading font-black text-[10px] sm:text-xs uppercase flex items-center justify-center gap-1 shadow-sm leading-tight text-center"
              >
                <Phone className="w-3.5 h-3.5 text-blue-300 shrink-0" />
                <span>LIGAR PASSAGEIRO</span>
              </a>

              <button
                type="button"
                onClick={() => {
                  setCardState('expanded');
                  setShowCancelProblemMenu(true);
                }}
                className="min-h-[42px] px-2 py-1.5 bg-red-600 hover:bg-red-500 text-white rounded-xl font-heading font-black text-[10px] sm:text-xs uppercase flex items-center justify-center gap-1 cursor-pointer shadow-sm leading-tight text-center"
              >
                <AlertTriangle className="w-3.5 h-3.5 shrink-0" />
                <span>EMERGÊNCIA</span>
              </button>
            </div>
          </div>
        ) : (
          /* ESTADOS 2 E 3: MÉDIO (55%) e EXPANDIDO (88%) — OVERFLOW-Y-AUTO + PADDING-BOTTOM 180px */
          <div
            className="flex-1 min-h-0 overflow-y-auto overscroll-contain px-3.5 sm:px-5 pt-3 space-y-3"
            style={{ paddingBottom: '180px' }}
          >
            {/* 1. Foto, nome e nota do passageiro + Ligar / WhatsApp */}
            <div className="flex items-center justify-between gap-2.5 bg-slate-50 border border-slate-200 rounded-2xl p-3">
              <div className="flex items-center gap-2.5 min-w-0">
                <div className="relative shrink-0">
                  <img
                    src={
                      effectiveRide.passengerAvatar ||
                      'https://images.unsplash.com/photo-1544005313-94ddf0286df2?w=150&auto=format&fit=crop&q=80'
                    }
                    alt={effectiveRide.passengerName}
                    className="w-12 h-12 rounded-full object-cover border-2 border-[#ff6a00] shadow-sm"
                  />
                  <span className="absolute -bottom-1 -right-1 bg-amber-400 text-slate-950 font-black text-[10px] px-1.5 rounded-full border border-slate-900">
                    ★ {(effectiveRide.passengerRating || 5.0).toFixed(1)}
                  </span>
                </div>
                <div className="min-w-0">
                  <span className="text-[10px] font-mono font-bold text-slate-500 uppercase block">
                    Passageiro
                  </span>
                  <h3 className="font-heading font-black text-sm sm:text-base text-slate-950 truncate">
                    {effectiveRide.passengerName}
                  </h3>
                  <p className="text-xs font-mono text-slate-600 truncate">
                    {effectiveRide.passengerPhone}
                  </p>
                </div>
              </div>

              <div className="flex items-center gap-1.5 shrink-0">
                <a
                  href={`tel:+55${cleanPhone}`}
                  className="px-2.5 py-2 bg-slate-900 hover:bg-slate-800 text-white rounded-xl font-heading font-bold text-xs flex items-center gap-1 shadow-xs active:scale-95"
                  title="Ligar para passageiro"
                >
                  <Phone className="w-3.5 h-3.5" />
                  <span>Ligar</span>
                </a>
                <a
                  href={`https://wa.me/55${cleanPhone}?text=${encodeURIComponent(
                    `Olá ${effectiveRide.passengerName}! Sou ${driver.name}, seu motorista RACE. Estou a caminho!`
                  )}`}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="px-2.5 py-2 bg-emerald-600 hover:bg-emerald-500 text-white rounded-xl font-heading font-bold text-xs flex items-center gap-1 shadow-xs active:scale-95"
                  title="Conversar no WhatsApp"
                >
                  <MessageCircle className="w-3.5 h-3.5" />
                  <span>WhatsApp</span>
                </a>
              </div>
            </div>

            {/* 2. Endereço completo de coleta com número + botão Navegar e 3. Endereço de destino com número */}
            <div className="bg-white border border-slate-200 rounded-2xl p-3 space-y-2.5 shadow-2xs">
              <div className="flex items-start justify-between gap-2">
                <div className="flex items-start gap-2 min-w-0">
                  <MapPin className="w-4 h-4 text-emerald-600 shrink-0 mt-0.5" />
                  <div className="min-w-0">
                    <span className="text-[10px] font-mono font-black text-emerald-700 uppercase block">
                      Coleta (Embarque com número)
                    </span>
                    <p className="text-xs sm:text-sm font-bold text-slate-950 leading-snug break-words">
                      {effectiveRide.pickup.address}
                    </p>
                  </div>
                </div>

                <a
                  href={externalNavUrl}
                  target="_blank"
                  rel="noopener noreferrer"
                  onClick={() => handleCenterRoute()}
                  className="px-3 py-2 bg-[#ff6a00] hover:bg-[#e05e00] text-white font-heading font-black text-xs rounded-xl flex items-center gap-1 shrink-0 shadow-xs active:scale-95"
                >
                  <Navigation className="w-3.5 h-3.5" />
                  <span>Navegar</span>
                </a>
              </div>

              <div className="border-t border-dashed border-slate-200" />

              <div className="flex items-start gap-2 min-w-0">
                <Flag className="w-4 h-4 text-[#ff6a00] shrink-0 mt-0.5" />
                <div className="min-w-0">
                  <span className="text-[10px] font-mono font-black text-[#ff6a00] uppercase block">
                    Destino Final (com número)
                  </span>
                  <p className="text-xs sm:text-sm font-bold text-slate-950 leading-snug break-words">
                    {effectiveRide.destination.address}
                  </p>
                </div>
              </div>
            </div>

            {/* 4. Valor total + Você recebe (85%), 5. Forma de pagamento, 6. Distância + tempo */}
            <div className="grid grid-cols-2 gap-2.5">
              <div className="bg-slate-50 border border-slate-200 rounded-xl p-2.5">
                <span className="text-[10px] font-mono font-bold text-slate-500 uppercase block">
                  Valor Total da Corrida
                </span>
                <span className="font-heading font-black text-base text-slate-950">
                  {formatBRL(totalValue)}
                </span>
              </div>

              <div className="bg-emerald-50 border border-emerald-300 rounded-xl p-2.5">
                <span className="text-[10px] font-mono font-bold text-emerald-800 uppercase block">
                  Você Recebe (85%)
                </span>
                <span className="font-heading font-black text-base text-emerald-700">
                  {formatBRL(driverNetValue)}
                </span>
                <span className="text-[10px] font-mono text-emerald-900/75 block">
                  Comissão Race 15%: {formatBRL(raceCommissionValue)}
                </span>
              </div>

              <div className="bg-slate-50 border border-slate-200 rounded-xl p-2.5">
                <span className="text-[10px] font-mono font-bold text-slate-500 uppercase block">
                  Forma de Pagamento
                </span>
                <span className="font-heading font-black text-xs sm:text-sm text-slate-950 flex items-center gap-1.5 mt-0.5">
                  {effectiveRide.paymentMethod === 'credit_card' ? (
                    <CreditCard className="w-4 h-4 text-amber-600 shrink-0" />
                  ) : effectiveRide.paymentMethod === 'money' ? (
                    <Wallet className="w-4 h-4 text-blue-600 shrink-0" />
                  ) : (
                    <QrCode className="w-4 h-4 text-emerald-600 shrink-0" />
                  )}
                  <span>{paymentLabel}</span>
                </span>
              </div>

              <div className="bg-slate-50 border border-slate-200 rounded-xl p-2.5">
                <span className="text-[10px] font-mono font-bold text-slate-500 uppercase block">
                  Distância + Tempo
                </span>
                <span className="font-heading font-black text-xs sm:text-sm text-[#ff6a00] flex items-center gap-1.5 mt-0.5">
                  <Clock className="w-4 h-4 shrink-0" />
                  <span>
                    {(distanceRemainingMeters / 1000).toFixed(1)} km • ~{minutesLeft} min
                  </span>
                </span>
              </div>
            </div>

            {/* BANNER DE PASSAGEIRO CONFIRMADO OU AVISO DE CÓDIGO NECESSÁRIO */}
            {isCodeConfirmed ? (
              <div className="bg-emerald-50 border-2 border-emerald-500 rounded-2xl p-3 flex items-center gap-2.5 shadow-xs">
                <ShieldCheck className="w-5 h-5 text-emerald-600 shrink-0" />
                <div>
                  <span className="font-heading font-black text-sm text-emerald-900 block">
                    {codeSuccessMessage || 'Passageiro confirmado!'}
                  </span>
                  <span className="text-xs font-bold text-emerald-700">
                    Código verificado. Você já pode iniciar e seguir para o destino.
                  </span>
                </div>
              </div>
            ) : (
              <div className="bg-amber-50 border border-amber-300 rounded-2xl p-2.5 flex items-center justify-between gap-2">
                <div className="flex items-center gap-2 min-w-0">
                  <KeyRound className="w-4 h-4 text-[#ff6a00] shrink-0" />
                  <span className="text-xs font-bold text-amber-950 leading-snug">
                    Confirme o código de 4 números do passageiro para liberar "INICIAR CORRIDA".
                  </span>
                </div>
                <button
                  type="button"
                  onClick={handleOpenCodeModal}
                  className="px-2.5 py-1.5 bg-[#ff6a00] hover:bg-[#e05e00] text-white font-heading font-black text-[11px] rounded-xl shrink-0 cursor-pointer"
                >
                  Digitar Código
                </button>
              </div>
            )}

            {/* BOTÕES EXTRA DE SEGURANÇA E NAVEGAÇÃO EXTERNA NO CARD EXPANDIDO */}
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-2.5">
              <button
                type="button"
                onClick={() => setShowExternalNavMenu(true)}
                className="w-full min-h-[56px] px-4 py-3 bg-slate-950 hover:bg-slate-800 text-white rounded-2xl font-heading font-black text-sm uppercase flex items-center justify-center gap-2 cursor-pointer shadow-md border border-slate-700"
              >
                <Navigation className="w-5 h-5 text-emerald-400 shrink-0" />
                <span>NAVEGAR NO GOOGLE MAPS / WAZE</span>
              </button>

              <a
                href={`tel:+55${cleanPhone}`}
                className="w-full min-h-[56px] px-4 py-3 bg-blue-700 hover:bg-blue-600 text-white rounded-2xl font-heading font-black text-sm uppercase flex items-center justify-center gap-2 shadow-md border border-blue-500"
              >
                <Phone className="w-5 h-5 shrink-0" />
                <span>LIGAR PARA O PASSAGEIRO</span>
              </a>
            </div>

            {/* 7. PILHA DOS BOTÕES INTEIROS EM COLUNA (z-index: 60): 1. AZUL, (INICIAR BLOQUEADO CINZA se sem código), 2. VERDE, 3. VERMELHO */}
            <div
              className="relative z-[60] flex flex-col gap-3 w-full pt-1"
              style={{ paddingBottom: 'calc(env(safe-area-inset-bottom, 0px) + 30px)' }}
            >
              {/* 1. BOTÃO AZUL EM CIMA: CHEGUEI NO LOCAL -> ABRE TELA DE CÓDIGO -> DEPOIS INICIAR CORRIDA */}
              {!isCodeConfirmed ? (
                <>
                  <button
                    type="button"
                    onClick={() => {
                      if (tripPhase === 'to_pickup') {
                        handleArrivedAtPickup();
                      } else {
                        handleOpenCodeModal();
                      }
                    }}
                    style={{ width: '100%', minHeight: '56px' }}
                    className="w-full min-h-[56px] py-3.5 px-4 rounded-2xl font-heading font-black text-sm sm:text-base uppercase flex items-center justify-center gap-2 shadow-md transition-all cursor-pointer active:scale-[0.99] border bg-blue-600 hover:bg-blue-500 text-white border-blue-500"
                  >
                    <KeyRound className="w-5 h-5 shrink-0" />
                    <span>
                      {tripPhase === 'to_pickup' ? 'CHEGUEI NO LOCAL' : 'DIGITAR CÓDIGO DO PASSAGEIRO'}
                    </span>
                  </button>

                  {/* Botão INICIAR CORRIDA BLOQUEADO E CINZA até confirmar código */}
                  <button
                    type="button"
                    disabled
                    style={{ width: '100%', minHeight: '56px' }}
                    className="w-full min-h-[56px] py-3.5 px-4 rounded-2xl font-heading font-black text-sm sm:text-base uppercase flex items-center justify-center gap-2 border border-slate-300 bg-slate-300 text-slate-600 cursor-not-allowed"
                    title="Confirme o código de 4 dígitos do passageiro para desbloquear"
                  >
                    <Lock className="w-5 h-5 shrink-0" />
                    <span>Digite o código para iniciar</span>
                  </button>
                </>
              ) : (
                <button
                  type="button"
                  onClick={handleStartTripToDestination}
                  disabled={tripPhase === 'to_destination' || tripPhase === 'completed'}
                  style={{ width: '100%', minHeight: '56px' }}
                  className={`w-full min-h-[56px] py-3.5 px-4 rounded-2xl font-heading font-black text-sm sm:text-base uppercase flex items-center justify-center gap-2 shadow-md transition-all border ${
                    tripPhase === 'to_destination' || tripPhase === 'completed'
                      ? 'bg-blue-100 text-blue-900 border-2 border-blue-500 cursor-default'
                      : 'bg-blue-600 hover:bg-blue-500 text-white border-blue-500 cursor-pointer active:scale-[0.99]'
                  }`}
                >
                  <Play className="w-5 h-5 shrink-0 fill-current" />
                  <span>
                    {tripPhase === 'to_destination' ? 'CORRIDA INICIADA • EM ROTA' : 'INICIAR CORRIDA'}
                  </span>
                </button>
              )}

              {/* 2. BOTÃO VERDE NO MEIO: FINALIZAR CORRIDA */}
              <button
                type="button"
                onClick={handleFinishRide}
                style={{ width: '100%', minHeight: '56px' }}
                className="w-full min-h-[56px] py-3.5 px-4 bg-emerald-600 hover:bg-emerald-500 text-white rounded-2xl font-heading font-black text-sm sm:text-base uppercase flex items-center justify-center gap-2 shadow-md transition-all cursor-pointer active:scale-[0.99] border border-emerald-500"
              >
                <CheckCircle2 className="w-5 h-5 shrink-0" />
                <span>FINALIZAR CORRIDA</span>
              </button>

              {/* 3. BOTÃO VERMELHO EMBAIXO: EMERGÊNCIA / PROBLEMA */}
              <button
                type="button"
                onClick={() => setShowCancelProblemMenu((prev) => !prev)}
                style={{ width: '100%', minHeight: '56px' }}
                className="w-full min-h-[56px] py-3.5 px-4 bg-red-600 hover:bg-red-500 text-white rounded-2xl font-heading font-black text-sm sm:text-base uppercase flex items-center justify-center gap-2 shadow-md transition-all cursor-pointer active:scale-[0.99] border border-red-500"
              >
                <XCircle className="w-5 h-5 shrink-0" />
                <span>EMERGÊNCIA / PROBLEMA</span>
              </button>

              {showCancelProblemMenu && (
                <div className="w-full bg-rose-50 border-2 border-red-300 rounded-2xl p-3 flex flex-col gap-2.5">
                  <button
                    type="button"
                    onClick={() => {
                      if (onCancelRide) onCancelRide();
                      onClose();
                    }}
                    style={{ width: '100%', minHeight: '56px' }}
                    className="w-full min-h-[56px] py-3 px-4 bg-red-700 hover:bg-red-600 text-white rounded-xl font-heading font-black text-sm uppercase flex items-center justify-center gap-2 cursor-pointer shadow-sm"
                  >
                    <XCircle className="w-4 h-4 shrink-0" />
                    <span>CONFIRMAR CANCELAMENTO</span>
                  </button>
                  <button
                    type="button"
                    onClick={() => {
                      setShowCancelProblemMenu(false);
                      if (onOpenSupport) onOpenSupport();
                    }}
                    style={{ width: '100%', minHeight: '56px' }}
                    className="w-full min-h-[56px] py-3 px-4 bg-amber-500 hover:bg-amber-400 text-slate-950 rounded-xl font-heading font-black text-sm uppercase flex items-center justify-center gap-2 cursor-pointer shadow-sm"
                  >
                    <AlertTriangle className="w-4 h-4 shrink-0" />
                    <span>ABRIR SUPORTE 24H / EMERGÊNCIA</span>
                  </button>
                </div>
              )}
            </div>
          </div>
        )}
      </div>

      {/* ESCOLHA RÁPIDA DE NAVEGADOR EXTERNO: GOOGLE MAPS / WAZE */}
      {showExternalNavMenu && (
        <div className="fixed inset-0 z-[1050] bg-slate-950/85 backdrop-blur-sm flex items-center justify-center p-4">
          <div className="w-full max-w-sm bg-white text-slate-950 rounded-3xl border-2 border-[#ff6a00] p-5 shadow-2xl space-y-4">
            <div className="text-center space-y-1">
              <h3 className="font-heading font-black text-lg text-slate-950 uppercase">
                Abrir Navegação Externa
              </h3>
              <p className="text-xs text-slate-600 font-semibold line-clamp-2">
                {activeTargetAddress}
              </p>
            </div>

            <div className="flex flex-col gap-3">
              <a
                href={externalNavUrl}
                target="_blank"
                rel="noopener noreferrer"
                onClick={() => setShowExternalNavMenu(false)}
                className="w-full min-h-[56px] py-3.5 px-4 bg-emerald-600 hover:bg-emerald-500 text-white rounded-2xl font-heading font-black text-base uppercase flex items-center justify-center gap-2 shadow-lg"
              >
                <ExternalLink className="w-5 h-5 shrink-0" />
                <span>ABRIR NO GOOGLE MAPS</span>
              </a>

              <a
                href={wazeNavUrl}
                target="_blank"
                rel="noopener noreferrer"
                onClick={() => setShowExternalNavMenu(false)}
                className="w-full min-h-[56px] py-3.5 px-4 bg-sky-500 hover:bg-sky-400 text-slate-950 rounded-2xl font-heading font-black text-base uppercase flex items-center justify-center gap-2 shadow-lg"
              >
                <Navigation className="w-5 h-5 shrink-0" />
                <span>ABRIR NO WAZE</span>
              </a>

              <button
                type="button"
                onClick={() => setShowExternalNavMenu(false)}
                className="w-full min-h-[48px] py-2.5 px-4 bg-slate-200 hover:bg-slate-300 text-slate-800 rounded-2xl font-heading font-bold text-sm uppercase cursor-pointer"
              >
                Voltar para o mapa do Race
              </button>
            </div>
          </div>
        </div>
      )}

      {/* TELA DE CONFIRMAÇÃO DO CÓDIGO DE 4 NÚMEROS DO PASSAGEIRO */}
      {isCodeModalOpen && (
        <div className="fixed inset-0 z-[1100] bg-slate-950/90 backdrop-blur-md flex items-center justify-center p-4 overflow-y-auto">
          <div className="w-full max-w-md bg-white text-slate-950 rounded-3xl border-2 border-[#ff6a00] p-5 sm:p-6 shadow-2xl space-y-4 my-auto">
            <div className="text-center space-y-1">
              <div className="w-12 h-12 rounded-2xl bg-blue-100 text-blue-700 border border-blue-300 flex items-center justify-center mx-auto">
                <ShieldCheck className="w-7 h-7" />
              </div>
              <h3 className="font-heading font-black text-lg sm:text-xl text-slate-950 uppercase tracking-wide">
                DIGITE O CÓDIGO DO PASSAGEIRO
              </h3>
              <p className="text-xs sm:text-sm text-slate-600 font-medium">
                Peça o código de 4 números exibido na caixa amarela do celular de{' '}
                <strong>{effectiveRide.passengerName}</strong>
              </p>
            </div>

            {/* 4 CAIXINHAS NUMÉRICAS GRANDES */}
            <div className="flex items-center justify-center gap-3 py-1">
              {[0, 1, 2, 3].map((idx) => (
                <input
                  key={idx}
                  ref={(el) => {
                    codeInputRefs.current[idx] = el;
                  }}
                  type="tel"
                  inputMode="numeric"
                  pattern="[0-9]*"
                  maxLength={4}
                  autoComplete="one-time-code"
                  disabled={Boolean(lockedUntil && secondsLeftToUnlock > 0)}
                  value={codeDigits[idx]}
                  onChange={(e) => handleDigitChange(idx, e.target.value)}
                  onKeyDown={(e) => handleDigitKeyDown(idx, e)}
                  className={`w-16 h-20 text-center font-mono font-black text-4xl rounded-2xl border-2 focus:outline-none transition-all ${
                    lockedUntil && secondsLeftToUnlock > 0
                      ? 'bg-slate-200 border-slate-300 text-slate-400 cursor-not-allowed'
                      : codeError
                      ? 'bg-rose-50 border-red-500 text-red-700 focus:border-red-600'
                      : 'bg-slate-50 border-slate-300 text-slate-950 focus:border-blue-600 focus:bg-white'
                  }`}
                  aria-label={`Dígito ${idx + 1} do código`}
                />
              ))}
            </div>

            {/* TECLADO NUMÉRICO INTEGRADO PARA FACILITAR NO CELULAR */}
            <div className="grid grid-cols-3 gap-2">
              {['1', '2', '3', '4', '5', '6', '7', '8', '9'].map((digit) => (
                <button
                  key={digit}
                  type="button"
                  disabled={Boolean(lockedUntil && secondsLeftToUnlock > 0)}
                  onClick={() => handleKeypadPress(digit)}
                  className="h-12 rounded-xl bg-slate-100 hover:bg-slate-200 active:scale-95 font-mono font-black text-xl text-slate-950 border border-slate-300 cursor-pointer disabled:opacity-40"
                >
                  {digit}
                </button>
              ))}
              <button
                type="button"
                onClick={() => setIsCodeModalOpen(false)}
                className="h-12 rounded-xl bg-slate-100 hover:bg-slate-200 active:scale-95 font-heading font-bold text-xs text-slate-700 border border-slate-300 cursor-pointer"
              >
                Minimizar
              </button>
              <button
                type="button"
                disabled={Boolean(lockedUntil && secondsLeftToUnlock > 0)}
                onClick={() => handleKeypadPress('0')}
                className="h-12 rounded-xl bg-slate-100 hover:bg-slate-200 active:scale-95 font-mono font-black text-xl text-slate-950 border border-slate-300 cursor-pointer disabled:opacity-40"
              >
                0
              </button>
              <button
                type="button"
                disabled={Boolean(lockedUntil && secondsLeftToUnlock > 0)}
                onClick={handleKeypadBackspace}
                className="h-12 rounded-xl bg-slate-200 hover:bg-slate-300 active:scale-95 flex items-center justify-center text-slate-800 border border-slate-300 cursor-pointer disabled:opacity-40"
                title="Apagar dígito"
              >
                <Delete className="w-5 h-5" />
              </button>
            </div>

            {/* MENSAGEM DE ERRO / BLOQUEIO DE 1 MINUTO */}
            {codeError && (
              <div className="bg-rose-50 border-2 border-red-400 rounded-2xl p-3 text-center space-y-1">
                <p className="text-xs sm:text-sm font-heading font-black text-red-700">
                  {codeError}
                </p>
                {lockedUntil && secondsLeftToUnlock > 0 && (
                  <p className="text-xs font-mono font-bold text-red-900">
                    Desbloqueia em {secondsLeftToUnlock}s
                  </p>
                )}
              </div>
            )}

            {/* BOTÕES DA TELA DE CÓDIGO EM COLUNA */}
            <div className="flex flex-col gap-3 w-full">
              <button
                type="button"
                disabled={Boolean(lockedUntil && secondsLeftToUnlock > 0)}
                onClick={handleConfirmCode}
                style={{ width: '100%', minHeight: '56px' }}
                className={`w-full min-h-[56px] py-3.5 px-4 rounded-2xl font-heading font-black text-sm sm:text-base uppercase flex items-center justify-center gap-2 shadow-md transition-all ${
                  lockedUntil && secondsLeftToUnlock > 0
                    ? 'bg-slate-300 text-slate-500 cursor-not-allowed border border-slate-300'
                    : 'bg-blue-600 hover:bg-blue-500 text-white border border-blue-500 cursor-pointer active:scale-[0.99]'
                }`}
              >
                <CheckCircle2 className="w-5 h-5 shrink-0" />
                <span>CONFIRMAR CÓDIGO</span>
              </button>

              <button
                type="button"
                onClick={() => setShowNoCodeOptions((prev) => !prev)}
                style={{ width: '100%', minHeight: '56px' }}
                className="w-full min-h-[56px] py-3.5 px-4 bg-red-600 hover:bg-red-500 text-white rounded-2xl font-heading font-black text-xs sm:text-sm uppercase flex items-center justify-center gap-2 shadow-md transition-all cursor-pointer active:scale-[0.99] border border-red-500"
              >
                <XCircle className="w-5 h-5 shrink-0" />
                <span>CANCELAR / PASSAGEIRO NÃO TEM CÓDIGO</span>
              </button>

              {showNoCodeOptions && (
                <div className="bg-rose-50 border-2 border-red-300 rounded-2xl p-3 flex flex-col gap-2.5">
                  <a
                    href={`tel:+55${cleanPhone}`}
                    style={{ width: '100%', minHeight: '56px' }}
                    className="w-full min-h-[56px] py-3 px-4 bg-emerald-600 hover:bg-emerald-500 text-white rounded-xl font-heading font-black text-sm uppercase flex items-center justify-center gap-2 shadow-sm"
                  >
                    <Phone className="w-4 h-4 shrink-0" />
                    <span>Ligar para o passageiro</span>
                  </a>
                  <button
                    type="button"
                    onClick={() => {
                      setIsCodeModalOpen(false);
                      if (onCancelRide) onCancelRide();
                      onClose();
                    }}
                    style={{ width: '100%', minHeight: '56px' }}
                    className="w-full min-h-[56px] py-3 px-4 bg-red-700 hover:bg-red-600 text-white rounded-xl font-heading font-black text-sm uppercase flex items-center justify-center gap-2 cursor-pointer shadow-sm"
                  >
                    <XCircle className="w-4 h-4 shrink-0" />
                    <span>Cancelar corrida</span>
                  </button>
                </div>
              )}
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
