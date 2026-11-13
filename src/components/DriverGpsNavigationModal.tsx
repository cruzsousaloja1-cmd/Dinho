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
import { formatBRL } from '../services/pricingService';
import { Driver, Ride } from '../types';

type DriverTripPhase = 'to_pickup' | 'arrived_pickup' | 'to_destination' | 'completed';

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

  // Dados efetivos da corrida aceita (sempre preenchidos para nunca faltar informação no card)
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

  // Fases do motorista: A CAMINHO DO PASSAGEIRO -> NO LOCAL -> A CAMINHO DO DESTINO -> FINALIZADA
  const [tripPhase, setTripPhase] = useState<DriverTripPhase>('to_pickup');
  // Card expansível/minimizável (NUNCA esconde completamente)
  const [isCardExpanded, setIsCardExpanded] = useState<boolean>(true);

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
  const [isVoiceMuted, setIsVoiceMuted] = useState(false);

  // Busca as duas rotas reais pelas ruas de Indaiatuba via OSRM:
  // 1) Motorista -> Coleta (Passageiro)
  // 2) Coleta -> Destino
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

  // 1. Inicializa o mapa Leaflet na METADE SUPERIOR com movimento livre
  useEffect(() => {
    if (!mapContainerRef.current) return;

    if (!mapInstanceRef.current) {
      const map = L.map(mapContainerRef.current, {
        center: [(pickupLat + destLat) / 2, (pickupLng + destLng) / 2],
        zoom: 15,
        minZoom: INDAIATUBA_MIN_ZOOM,
        maxZoom: INDAIATUBA_MAX_ZOOM,
        maxBounds: INDAIATUBA_BOUNDS,
        maxBoundsViscosity: 0.5,
        dragging: true,
        scrollWheelZoom: true,
        touchZoom: true,
        doubleClickZoom: true,
        zoomControl: true,
      });

      // OpenStreetMap Oficial Claro - Ruas nítidas com nomes
      L.tileLayer('https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png', {
        attribution: '&copy; OpenStreetMap',
        maxZoom: 19,
      }).addTo(map);

      map.zoomControl?.setPosition('topright');

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

  // Reajusta o tamanho do mapa quando o card expande/minimiza
  useEffect(() => {
    const t = setTimeout(() => {
      mapInstanceRef.current?.invalidateSize({ animate: true });
    }, 220);
    return () => clearTimeout(t);
  }, [isCardExpanded]);

  // 2. Desenha rota em tempo real + Pinos de Coleta (Passageiro) e Destino + fitBounds inicial coleta -> destino
  useEffect(() => {
    const map = mapInstanceRef.current;
    if (!map) return;

    const currentCoords = activeRoute.coordinates;
    const remainingCoords =
      stepRef.current < currentCoords.length - 1
        ? currentCoords.slice(stepRef.current)
        : currentCoords;

    // Borda branca da rota ativa
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

    // Linha principal (laranja #ff6a00 para coleta, azul/esmeralda no trajeto destino)
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

    // Rota secundária coleta -> destino (tracejada enquanto ainda vai buscar passageiro)
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
      <div style="filter: drop-shadow(0 4px 6px rgba(0,0,0,0.35)); display: flex; flex-direction: column; align-items: center;">
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
      <div style="filter: drop-shadow(0 4px 6px rgba(0,0,0,0.35)); display: flex; flex-direction: column; align-items: center;">
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

    // Centraliza o mapa na rota coleta -> destino 1 única vez ao aceitar
    if (!hasInitialFitBoundsRef.current) {
      hasInitialFitBoundsRef.current = true;
      const allPoints: [number, number][] = [
        [startCarLat, startCarLng],
        [pickupLat, pickupLng],
        [destLat, destLng],
        ...pickupRoute.coordinates,
        ...destRoute.coordinates,
      ];
      const bounds = L.latLngBounds(allPoints);
      map.fitBounds(bounds, {
        padding: [45, 45],
        animate: true,
      });
    }
  }, [activeRoute, pickupRoute, destRoute, tripPhase, currentStepIndex, pickupLat, pickupLng, destLat, destLng, startCarLat, startCarLng, effectiveRide.passengerName]);

  // 3. Marcador do carro/moto REAL visto de cima (sem bolinha) com rotação em tempo real
  useEffect(() => {
    const map = mapInstanceRef.current;
    if (!map) return;

    const vehicleHtml = isMotoboy
      ? `
      <div style="display: flex; flex-direction: column; align-items: center;">
        <div style="width: 48px; height: 48px; display: flex; align-items: center; justify-content: center; transform: rotate(${carHeading}deg); transition: transform 0.45s cubic-bezier(0.4, 0, 0.2, 1); filter: drop-shadow(0 6px 8px rgba(0,0,0,0.45));">
          <svg width="48" height="48" viewBox="0 0 48 48" fill="none" xmlns="http://www.w3.org/2000/svg">
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
        <div style="background: #09090b; color: #ff6a00; font-family: monospace; font-size: 10px; font-weight: 900; padding: 2px 7px; border-radius: 9999px; border: 1.5px solid #ffffff; margin-top: 2px; box-shadow: 0 4px 6px rgba(0,0,0,0.3); white-space: nowrap;">
          ${driver.vehiclePlate || 'RACE-2026'} • ${speedKmh} km/h
        </div>
      </div>
      `
      : `
      <div style="display: flex; flex-direction: column; align-items: center;">
        <div style="width: 48px; height: 48px; display: flex; align-items: center; justify-content: center; transform: rotate(${carHeading}deg); transition: transform 0.45s cubic-bezier(0.4, 0, 0.2, 1); filter: drop-shadow(0 6px 8px rgba(0,0,0,0.45));">
          <svg width="48" height="48" viewBox="0 0 48 48" fill="none" xmlns="http://www.w3.org/2000/svg">
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
        <div style="background: #09090b; color: #ff6a00; font-family: monospace; font-size: 10px; font-weight: 900; padding: 2px 7px; border-radius: 9999px; border: 1.5px solid #ffffff; margin-top: 2px; box-shadow: 0 4px 6px rgba(0,0,0,0.3); white-space: nowrap;">
          ${driver.vehiclePlate || 'RACE-2026'} • ${speedKmh} km/h
        </div>
      </div>
      `;

    const carIcon = L.divIcon({
      className: 'gps-driver-car',
      html: vehicleHtml,
      iconSize: [48, 62],
      iconAnchor: [24, 24],
    });

    if (carMarkerRef.current) {
      carMarkerRef.current.setLatLng(carPos);
      carMarkerRef.current.setIcon(carIcon);
    } else {
      carMarkerRef.current = L.marker(carPos, { icon: carIcon }).addTo(map);
    }
  }, [carPos, carHeading, speedKmh, driver.vehiclePlate, isMotoboy]);

  // 4. Simulação de condução pelas ruas em tempo real (sem prender o mapa)
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

  // Ações dos Botões Fixos do Motorista
  const handleArrivedAtPickup = () => {
    setTripPhase('arrived_pickup');
    const pickupPoint: [number, number] = [pickupLat, pickupLng];
    setCarPos(pickupPoint);
    setSpeedKmh(0);
    setDistanceRemainingMeters(0);
    setSecondsRemaining(0);
  };

  const handleStartTripToDestination = () => {
    setTripPhase('to_destination');
    stepRef.current = 0;
    setCurrentStepIndex(0);
    const startPt = destRoute.coordinates[0] || [pickupLat, pickupLng];
    setCarPos(startPt);
    setDistanceRemainingMeters(destRoute.totalDistanceMeters);
    setSecondsRemaining(destRoute.totalDurationSeconds);

    if (mapInstanceRef.current) {
      const bounds = L.latLngBounds(destRoute.coordinates);
      mapInstanceRef.current.fitBounds(bounds, { padding: [45, 45], animate: true });
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
    const bounds = L.latLngBounds([
      carPos,
      [pickupLat, pickupLng],
      [destLat, destLng],
    ]);
    mapInstanceRef.current.fitBounds(bounds, { padding: [45, 45], animate: true });
  };

  // Gesto de arrastar o card para cima (expandir) ou para baixo (minimizar, sem nunca esconder)
  const handleCardTouchStart = (e: React.TouchEvent) => {
    touchStartYRef.current = e.touches[0].clientY;
  };
  const handleCardTouchEnd = (e: React.TouchEvent) => {
    if (touchStartYRef.current === null) return;
    const deltaY = e.changedTouches[0].clientY - touchStartYRef.current;
    if (deltaY < -30) {
      setIsCardExpanded(true);
    } else if (deltaY > 30) {
      setIsCardExpanded(false);
    }
    touchStartYRef.current = null;
  };

  // Próxima manobra
  const steps = activeRoute.steps;
  const currentManeuver = (() => {
    if (tripPhase === 'arrived_pickup') {
      return {
        instruction: 'Você chegou ao local de embarque!',
        sub: effectiveRide.pickup.address,
        modifier: 'arrive',
      };
    }
    if (tripPhase === 'completed') {
      return {
        instruction: 'Destino alcançado!',
        sub: effectiveRide.destination.address,
        modifier: 'arrive',
      };
    }
    const stepIdx = Math.min(
      Math.floor((currentStepIndex / (activeRoute.coordinates.length || 1)) * steps.length),
      steps.length - 1
    );
    const active = steps[stepIdx] || steps[0];
    return {
      instruction: active.instruction,
      sub: `Siga pela ${active.streetName}`,
      modifier: active.modifier || 'straight',
    };
  })();

  const minutesLeft = Math.max(Math.ceil(secondsRemaining / 60), 1);
  const totalValue = effectiveRide.price || 28.5;
  const driverNetValue = Number((totalValue * 0.85).toFixed(2));
  const raceCommissionValue = Number((totalValue * 0.15).toFixed(2));
  const cleanPhone = (effectiveRide.passengerPhone || '19998871122').replace(/\D/g, '');

  const paymentLabel =
    effectiveRide.paymentMethod === 'credit_card'
      ? 'Cartão no App'
      : effectiveRide.paymentMethod === 'money'
      ? 'Dinheiro ao Motorista'
      : 'PIX no App';

  const activeTargetLat = tripPhase === 'to_destination' ? destLat : pickupLat;
  const activeTargetLng = tripPhase === 'to_destination' ? destLng : pickupLng;
  const externalNavUrl = `https://www.google.com/maps/dir/?api=1&destination=${activeTargetLat},${activeTargetLng}&travelmode=driving`;

  const statusText =
    tripPhase === 'to_destination'
      ? 'A CAMINHO DO DESTINO'
      : tripPhase === 'arrived_pickup'
      ? 'NO LOCAL DE EMBARQUE'
      : tripPhase === 'completed'
      ? 'CORRIDA FINALIZADA'
      : 'A CAMINHO DO PASSAGEIRO';

  const statusBadgeColor =
    tripPhase === 'to_destination'
      ? 'bg-emerald-600 text-white border-emerald-400'
      : tripPhase === 'arrived_pickup'
      ? 'bg-blue-600 text-white border-blue-400'
      : 'bg-[#ff6a00] text-white border-[#ff8533]';

  return (
    <div className="fixed inset-0 z-50 bg-slate-950 text-white flex flex-col w-screen h-screen overflow-hidden select-none">
      {/* PARTE DE CIMA: MAPA FULLSCREEN INTERATIVO (nunca cobre o card inferior) */}
      <div className="relative flex-1 min-h-[34vh] w-full overflow-hidden bg-white">
        {/* HUD SUPERIOR DE MANOBRA GPS */}
        <div className="absolute top-2.5 left-2.5 right-14 z-[1000] pointer-events-none">
          <div className="max-w-xl bg-emerald-600/95 backdrop-blur-md text-white rounded-2xl p-2.5 shadow-xl flex items-center justify-between gap-2.5 border border-emerald-300">
            <div className="flex items-center gap-2.5 min-w-0">
              <div className="w-9 h-9 rounded-xl bg-slate-950 text-emerald-400 flex items-center justify-center shrink-0">
                {currentManeuver.modifier === 'right' ? (
                  <CornerUpRight className="w-5 h-5 stroke-[3]" />
                ) : currentManeuver.modifier === 'left' ? (
                  <CornerUpLeft className="w-5 h-5 stroke-[3]" />
                ) : (
                  <ArrowUp className="w-5 h-5 stroke-[3]" />
                )}
              </div>
              <div className="min-w-0">
                <h2 className="font-heading font-black text-xs sm:text-sm leading-tight truncate">
                  {currentManeuver.instruction}
                </h2>
                <p className="text-[11px] text-emerald-100 font-semibold truncate">
                  {currentManeuver.sub}
                </p>
              </div>
            </div>

            <div className="w-11 h-11 rounded-full bg-black/90 border-2 border-white flex flex-col items-center justify-center shrink-0">
              <span className="font-heading font-black text-white text-xs leading-none">
                {speedKmh}
              </span>
              <span className="text-[8px] font-mono text-zinc-400 uppercase">km/h</span>
            </div>
          </div>
        </div>

        {/* BOTÕES LATERAIS DO MAPA */}
        <div className="absolute top-20 right-2.5 z-[1000] flex flex-col gap-2 pointer-events-none">
          <button
            type="button"
            onClick={() => setIsVoiceMuted(!isVoiceMuted)}
            className="pointer-events-auto w-9 h-9 bg-black/90 hover:bg-zinc-800 border border-zinc-700 text-white rounded-xl shadow-lg flex items-center justify-center cursor-pointer active:scale-95"
            title="Áudio de Orientação"
          >
            {isVoiceMuted ? (
              <VolumeX className="w-4 h-4 text-rose-400" />
            ) : (
              <Volume2 className="w-4 h-4 text-emerald-400" />
            )}
          </button>

          <button
            type="button"
            onClick={() => {
              if (mapInstanceRef.current) {
                mapInstanceRef.current.setView(carPos, 16, { animate: true });
              }
            }}
            className="pointer-events-auto w-9 h-9 bg-white hover:bg-slate-100 border border-slate-300 text-[#ff6a00] rounded-xl shadow-lg flex items-center justify-center cursor-pointer active:scale-95"
            title="Centralizar no motorista"
          >
            <Crosshair className="w-4 h-4" />
          </button>

          <button
            type="button"
            onClick={handleCenterRoute}
            className="pointer-events-auto w-9 h-9 bg-white hover:bg-slate-100 border border-slate-300 text-slate-900 rounded-xl shadow-lg flex items-center justify-center cursor-pointer active:scale-95"
            title="Ver rota coleta e destino"
          >
            <Route className="w-4 h-4" />
          </button>

          <button
            type="button"
            onClick={onClose}
            className="pointer-events-auto w-9 h-9 bg-slate-900 hover:bg-slate-800 border border-slate-700 text-white rounded-xl shadow-lg flex items-center justify-center cursor-pointer active:scale-95"
            title="Minimizar mapa e voltar ao painel"
          >
            <ArrowLeft className="w-4 h-4" />
          </button>
        </div>

        {/* CANVAS DO MAPA LEAFLET */}
        <div ref={mapContainerRef} className="w-full h-full z-0 bg-white" />
      </div>

      {/* PARTE DE BAIXO: CARD FIXO DA CORRIDA SEMPRE VISÍVEL (ARRÁSTAVEL EXPANDIR / MINIMIZAR, NUNCA ESCONDE) */}
      <div
        className={`shrink-0 w-full bg-white text-slate-950 border-t-4 border-[#ff6a00] rounded-t-3xl shadow-[0_-12px_40px_rgba(0,0,0,0.45)] z-20 flex flex-col transition-all duration-200 ${
          isCardExpanded ? 'max-h-[62vh]' : 'min-h-[210px] max-h-[34vh]'
        }`}
      >
        {/* Alça de Arraste + Toggle Expandir / Minimizar (sempre visível) */}
        <div
          onTouchStart={handleCardTouchStart}
          onTouchEnd={handleCardTouchEnd}
          onClick={() => setIsCardExpanded((prev) => !prev)}
          className="px-4 pt-2 pb-1.5 flex flex-col items-center gap-1 cursor-pointer border-b border-slate-100 shrink-0"
          title="Arraste ou toque para expandir ou minimizar"
        >
          <div className="w-12 h-1.5 rounded-full bg-slate-300" />
          <div className="w-full flex items-center justify-between gap-2">
            {/* 1. STATUS GRANDE: A CAMINHO DO PASSAGEIRO / A CAMINHO DO DESTINO */}
            <div className={`px-3 py-1 rounded-xl border font-heading font-black text-xs sm:text-sm tracking-wider uppercase flex items-center gap-2 shadow-xs ${statusBadgeColor}`}>
              <span className="w-2.5 h-2.5 rounded-full bg-white animate-ping shrink-0" />
              <span>{statusText}</span>
            </div>

            <span className="text-[11px] font-bold text-slate-500 flex items-center gap-1 shrink-0">
              {isCardExpanded ? (
                <>
                  <span>Minimizar</span>
                  <ChevronDown className="w-4 h-4 text-[#ff6a00]" />
                </>
              ) : (
                <>
                  <span>Expandir</span>
                  <ChevronUp className="w-4 h-4 text-[#ff6a00]" />
                </>
              )}
            </span>
          </div>
        </div>

        {/* Conteúdo Rolável das Informações da Corrida */}
        <div className="px-3.5 sm:px-5 py-2.5 overflow-y-auto space-y-2.5 flex-1">
          {/* 2. Foto, nome e nota do passageiro + botão Ligar / WhatsApp */}
          <div className="flex items-center justify-between gap-2.5 bg-slate-50 border border-slate-200 rounded-2xl p-2.5">
            <div className="flex items-center gap-2.5 min-w-0">
              <div className="relative shrink-0">
                <img
                  src={
                    effectiveRide.passengerAvatar ||
                    'https://images.unsplash.com/photo-1544005313-94ddf0286df2?w=150&auto=format&fit=crop&q=80'
                  }
                  alt={effectiveRide.passengerName}
                  className="w-11 h-11 rounded-full object-cover border-2 border-[#ff6a00] shadow-sm"
                />
                <span className="absolute -bottom-1 -right-1 bg-amber-400 text-slate-950 font-black text-[9px] px-1 rounded-full border border-slate-900">
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
                <p className="text-[11px] font-mono text-slate-600 truncate">
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

          {/* 3. Endereço de coleta com número + botão "Navegar" e 4. Endereço de destino com número */}
          <div className="bg-white border border-slate-200 rounded-2xl p-2.5 space-y-2 shadow-2xs">
            <div className="flex items-start justify-between gap-2">
              <div className="flex items-start gap-2 min-w-0">
                <MapPin className="w-4 h-4 text-emerald-600 shrink-0 mt-0.5" />
                <div className="min-w-0">
                  <span className="text-[10px] font-mono font-black text-emerald-700 uppercase block">
                    Coleta (Embarque)
                  </span>
                  <p className="text-xs sm:text-sm font-bold text-slate-950 leading-snug">
                    {effectiveRide.pickup.address}
                  </p>
                </div>
              </div>

              <a
                href={externalNavUrl}
                target="_blank"
                rel="noopener noreferrer"
                onClick={() => handleCenterRoute()}
                className="px-3 py-1.5 bg-[#ff6a00] hover:bg-[#e05e00] text-white font-heading font-black text-xs rounded-xl flex items-center gap-1 shrink-0 shadow-xs active:scale-95"
                title="Abrir rota externa GPS"
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
                  Destino Final
                </span>
                <p className="text-xs sm:text-sm font-bold text-slate-950 leading-snug">
                  {effectiveRide.destination.address}
                </p>
              </div>
            </div>
          </div>

          {/* 5. Valor total + Você recebe (85%), 6. Forma de pagamento, 7. Distância e tempo */}
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-2">
            <div className="bg-slate-50 border border-slate-200 rounded-xl p-2">
              <span className="text-[10px] font-mono font-bold text-slate-500 uppercase block">
                Valor Total
              </span>
              <span className="font-heading font-black text-sm sm:text-base text-slate-950">
                {formatBRL(totalValue)}
              </span>
            </div>

            <div className="bg-emerald-50 border border-emerald-300 rounded-xl p-2">
              <span className="text-[10px] font-mono font-bold text-emerald-800 uppercase block">
                Você Recebe (85%)
              </span>
              <span className="font-heading font-black text-sm sm:text-base text-emerald-700">
                {formatBRL(driverNetValue)}
              </span>
              <span className="text-[9px] font-mono text-emerald-900/75 block">
                Race 15%: {formatBRL(raceCommissionValue)}
              </span>
            </div>

            <div className="bg-slate-50 border border-slate-200 rounded-xl p-2">
              <span className="text-[10px] font-mono font-bold text-slate-500 uppercase block">
                Pagamento
              </span>
              <span className="font-heading font-black text-xs sm:text-sm text-slate-950 flex items-center gap-1 mt-0.5">
                {effectiveRide.paymentMethod === 'credit_card' ? (
                  <CreditCard className="w-3.5 h-3.5 text-amber-600 shrink-0" />
                ) : effectiveRide.paymentMethod === 'money' ? (
                  <Wallet className="w-3.5 h-3.5 text-blue-600 shrink-0" />
                ) : (
                  <QrCode className="w-3.5 h-3.5 text-emerald-600 shrink-0" />
                )}
                <span className="truncate">{paymentLabel}</span>
              </span>
            </div>

            <div className="bg-slate-50 border border-slate-200 rounded-xl p-2">
              <span className="text-[10px] font-mono font-bold text-slate-500 uppercase block">
                Distância / Tempo
              </span>
              <span className="font-heading font-black text-xs sm:text-sm text-[#ff6a00] flex items-center gap-1 mt-0.5">
                <Clock className="w-3.5 h-3.5 shrink-0" />
                <span>
                  {(distanceRemainingMeters / 1000).toFixed(1)} km • {minutesLeft} min
                </span>
              </span>
            </div>
          </div>
        </div>

        {/* 8. BOTÕES GRANDES E FIXOS NO CARD (sempre visíveis no rodapé) */}
        <div className="px-3.5 sm:px-5 py-2.5 bg-slate-50 border-t border-slate-200 space-y-2 shrink-0">
          <div className="grid grid-cols-3 gap-2">
            <button
              type="button"
              onClick={handleArrivedAtPickup}
              disabled={tripPhase === 'to_destination' || tripPhase === 'completed'}
              className={`py-2.5 px-2 rounded-xl font-heading font-black text-[11px] sm:text-xs uppercase flex items-center justify-center gap-1 shadow-sm transition-all cursor-pointer active:scale-95 ${
                tripPhase === 'to_pickup'
                  ? 'bg-[#ff6a00] hover:bg-[#e05e00] text-white border border-[#ff8533]'
                  : tripPhase === 'arrived_pickup'
                  ? 'bg-emerald-100 text-emerald-900 border-2 border-emerald-500'
                  : 'bg-slate-200 text-slate-400 cursor-not-allowed'
              }`}
            >
              <MapPin className="w-3.5 h-3.5 shrink-0" />
              <span className="truncate">CHEGUEI NO LOCAL</span>
            </button>

            <button
              type="button"
              onClick={handleStartTripToDestination}
              disabled={tripPhase === 'to_destination' || tripPhase === 'completed'}
              className={`py-2.5 px-2 rounded-xl font-heading font-black text-[11px] sm:text-xs uppercase flex items-center justify-center gap-1 shadow-sm transition-all cursor-pointer active:scale-95 ${
                tripPhase === 'arrived_pickup' || tripPhase === 'to_pickup'
                  ? 'bg-blue-600 hover:bg-blue-500 text-white border border-blue-500'
                  : 'bg-blue-100 text-blue-900 border-2 border-blue-500'
              }`}
            >
              <Play className="w-3.5 h-3.5 shrink-0 fill-current" />
              <span className="truncate">INICIAR CORRIDA</span>
            </button>

            <button
              type="button"
              onClick={handleFinishRide}
              className="py-2.5 px-2 bg-emerald-600 hover:bg-emerald-500 text-white rounded-xl font-heading font-black text-[11px] sm:text-xs uppercase flex items-center justify-center gap-1 shadow-sm transition-all cursor-pointer active:scale-95 border border-emerald-500"
            >
              <CheckCircle2 className="w-3.5 h-3.5 shrink-0" />
              <span className="truncate">FINALIZAR CORRIDA</span>
            </button>
          </div>

          <div className="grid grid-cols-2 gap-2">
            <button
              type="button"
              onClick={() => {
                if (onCancelRide) onCancelRide();
                onClose();
              }}
              className="py-2 px-3 bg-white hover:bg-rose-50 text-rose-600 border border-rose-300 rounded-xl font-heading font-black text-xs uppercase flex items-center justify-center gap-1.5 cursor-pointer active:scale-95"
            >
              <XCircle className="w-3.5 h-3.5 shrink-0" />
              <span>CANCELAR</span>
            </button>

            <button
              type="button"
              onClick={() => {
                if (onOpenSupport) onOpenSupport();
              }}
              className="py-2 px-3 bg-white hover:bg-amber-50 text-amber-800 border border-amber-300 rounded-xl font-heading font-black text-xs uppercase flex items-center justify-center gap-1.5 cursor-pointer active:scale-95"
            >
              <AlertTriangle className="w-3.5 h-3.5 shrink-0 text-amber-600" />
              <span>PROBLEMA / SUPORTE</span>
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};
