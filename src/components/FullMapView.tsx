import React, { useEffect, useRef, useState } from 'react';
import L from 'leaflet';
import { Driver, LocationPoint, Ride } from '../types';
import { 
  ArrowLeft, 
  Crosshair, 
  CornerUpRight, 
  CornerUpLeft, 
  ArrowUp, 
  Compass, 
  Route, 
  Clock, 
  Gauge, 
  CheckCircle2, 
  Play, 
  Car,
  BellRing
} from 'lucide-react';
import { 
  INDAIATUBA_CENTER_COORDS, 
  INDAIATUBA_BOUNDS, 
  INDAIATUBA_MIN_ZOOM, 
  INDAIATUBA_MAX_ZOOM 
} from '../config/indaiatuba';
import { 
  fetchRealStreetRoute, 
  calculateBearing, 
  StreetRouteResult, 
  RouteStep,
  INDAIATUBA_REAL_STREET_COORDINATES, 
  INDAIATUBA_REAL_STEPS 
} from '../services/osrmRoutingService';

interface FullMapViewProps {
  onClose: () => void;
  pickup: LocationPoint | null;
  destination: LocationPoint | null;
  activeDriver: Driver | null;
  activeRide: Ride | null;
  driverPosition?: { lat: number; lng: number };
  onUpdateDriverPosition?: (pos: { lat: number; lng: number }) => void;
}

export const FullMapView: React.FC<FullMapViewProps> = ({
  onClose,
  pickup,
  destination,
  activeDriver,
  activeRide,
  driverPosition,
  onUpdateDriverPosition,
}) => {
  const mapContainerRef = useRef<HTMLDivElement>(null);
  const mapInstanceRef = useRef<L.Map | null>(null);
  const driverMarkerRef = useRef<L.Marker | null>(null);
  const pickupMarkerRef = useRef<L.Marker | null>(null);
  const destMarkerRef = useRef<L.Marker | null>(null);
  const routePolylineRef = useRef<L.Polyline | null>(null);
  const fullPolylineRef = useRef<L.Polyline | null>(null);

  const stepRef = useRef(0);
  const secondsTimerRef = useRef(180);

  // Coordenadas padrão em Indaiatuba
  const pLat = pickup?.lat ?? -23.0955;
  const pLng = pickup?.lng ?? -47.2250;
  const startCarLat = -23.084087;
  const startCarLng = -47.212027;

  // Driver details
  const effectiveDriver: Driver = activeRide?.driver || activeDriver || {
    id: 'drv-indaiatuba-1',
    name: 'Marcos Silva',
    avatar: 'https://images.unsplash.com/photo-1534528741775-53994a69daeb?w=150&auto=format&fit=crop&q=80',
    phone: '(19) 99876-5432',
    email: 'motorista@race.com.br',
    cpf: '000.***.***-00',
    cnh: '01234567890',
    category: 'economica',
    vehicleModel: 'Chevrolet Onix Plus',
    vehiclePlate: 'IND-2E24',
    vehicleColor: 'Prata Metálico',
    vehicleYear: 2024,
    rating: 4.98,
    totalRides: 1420,
    status: 'online',
    lat: startCarLat,
    lng: startCarLng,
    weeklyPlanActive: true,
    weeklyFeePaidAt: new Date().toISOString(),
    weeklyFeeExpiresAt: new Date(Date.now() + 7 * 86400000).toISOString(),
    earningsToday: 180,
    earningsWeek: 1240,
    cnhVerified: true,
    vehicleVerified: true,
    criminalRecordClear: true,
    registrationDate: '2024-01-01',
  };

  // Rota real consultada via OSRM com ruas e curvas reais
  const [routeData, setRouteData] = useState<StreetRouteResult>({
    coordinates: INDAIATUBA_REAL_STREET_COORDINATES,
    steps: INDAIATUBA_REAL_STEPS,
    totalDistanceMeters: 1800,
    totalDurationSeconds: 180,
  });

  const [carPos, setCarPos] = useState<[number, number]>(() => {
    if (driverPosition) return [driverPosition.lat, driverPosition.lng];
    return [startCarLat, startCarLng];
  });
  const [carHeading, setCarHeading] = useState(209); // Ângulo inicial da Av. Presidente Vargas
  const [speedKmh, setSpeedKmh] = useState(44);
  const [currentStepIndex, setCurrentStepIndex] = useState(0);

  // Estados de navegação estilo Uber
  const [secondsRemaining, setSecondsRemaining] = useState(180);
  const [distanceRemainingMeters, setDistanceRemainingMeters] = useState(1800);
  const [hasDriverArrived, setHasDriverArrived] = useState(false);
  const [isRideInProgress, setIsRideInProgress] = useState(false);
  const [isRideFinished, setIsRideFinished] = useState(false);

  // 1. Busca rota real pelas ruas via OSRM ao iniciar
  useEffect(() => {
    let active = true;
    fetchRealStreetRoute(startCarLat, startCarLng, pLat, pLng).then((res) => {
      if (active && res.coordinates.length > 0) {
        setRouteData(res);
        setDistanceRemainingMeters(res.totalDistanceMeters);
        setSecondsRemaining(res.totalDurationSeconds);
        secondsTimerRef.current = res.totalDurationSeconds;
        setCarPos(res.coordinates[0]);
      }
    });
    return () => {
      active = false;
    };
  }, [pLat, pLng]);

  // 2. Inicializa Leaflet Map Fullscreen com Zoom 15 no centro de Indaiatuba
  useEffect(() => {
    if (!mapContainerRef.current) return;

    if (!mapInstanceRef.current) {
      const map = L.map(mapContainerRef.current, {
        center: INDAIATUBA_CENTER_COORDS,
        zoom: 15,
        minZoom: INDAIATUBA_MIN_ZOOM,
        maxZoom: INDAIATUBA_MAX_ZOOM,
        maxBounds: INDAIATUBA_BOUNDS,
        maxBoundsViscosity: 1.0, // Impede de arrastar para fora de Indaiatuba
        zoomControl: false,
      });

      // CartoDB Dark Matter estilo Uber Black / Night Mode
      L.tileLayer('https://{s}.basemaps.cartocdn.com/dark_all/{z}/{x}/{y}{r}.png', {
        attribution: '&copy; OpenStreetMap contributors &copy; CARTO',
        subdomains: 'abcd',
        maxZoom: 19,
      }).addTo(map);

      // Controle de zoom no topo direito
      L.control.zoom({ position: 'topright' }).addTo(map);

      mapInstanceRef.current = map;
      setTimeout(() => map.invalidateSize(), 200);
    }

    return () => {
      if (mapInstanceRef.current) {
        mapInstanceRef.current.remove();
        mapInstanceRef.current = null;
      }
    };
  }, []);

  // 3. Desenha a rota grossa laranja #ff6a00 seguindo o asfalto das ruas
  useEffect(() => {
    const map = mapInstanceRef.current;
    if (!map || routeData.coordinates.length === 0) return;

    if (routePolylineRef.current) {
      routePolylineRef.current.setLatLngs(routeData.coordinates);
    } else {
      routePolylineRef.current = L.polyline(routeData.coordinates, {
        color: '#ff6a00',
        weight: 7,
        opacity: 0.95,
        lineCap: 'round',
        lineJoin: 'round',
      }).addTo(map);
    }
  }, [routeData]);

  // 4. Marcador Azul do Passageiro
  useEffect(() => {
    const map = mapInstanceRef.current;
    if (!map) return;

    const passengerHtml = `
      <div class="relative flex flex-col items-center">
        <div class="absolute -top-1 w-10 h-10 rounded-full bg-blue-500/35 animate-ping"></div>
        <div class="relative w-9 h-9 rounded-full bg-blue-600 border-2 border-white shadow-2xl flex items-center justify-center text-white text-sm font-bold">
          👤
        </div>
        <div class="bg-blue-950/95 text-blue-200 text-[11px] px-2.5 py-0.5 rounded-full border border-blue-400 mt-1 font-bold whitespace-nowrap shadow-xl">
          Passageiro (Você)
        </div>
      </div>
    `;

    const passengerIcon = L.divIcon({
      className: 'passenger-blue-marker',
      html: passengerHtml,
      iconSize: [40, 50],
      iconAnchor: [20, 25],
    });

    if (pickupMarkerRef.current) {
      pickupMarkerRef.current.setLatLng([pLat, pLng]);
    } else {
      pickupMarkerRef.current = L.marker([pLat, pLng], { icon: passengerIcon }).addTo(map);
    }
  }, [pLat, pLng]);

  // 5. Marcador do Carro estilo Uber: GIRA CONFORME A CURVA com seta direcional e faróis
  useEffect(() => {
    const map = mapInstanceRef.current;
    if (!map) return;

    const carHtml = `
      <div class="relative flex items-center justify-center" style="transform: rotate(${carHeading}deg); transition: transform 0.4s ease-out;">
        <div class="absolute w-12 h-12 rounded-full bg-[#ff6a00]/30 animate-pulse"></div>
        <!-- Ícone do Carro Top-Down estilo Uber -->
        <svg width="44" height="44" viewBox="0 0 48 48" fill="none" class="drop-shadow-2xl">
          <!-- Seta Direcional na frente -->
          <path d="M24 2 L30 13 L24 10 L18 13 Z" fill="#ffffff" />
          <!-- Corpo do Carro -->
          <rect x="15" y="8" width="18" height="34" rx="7" fill="#ff6a00" stroke="#ffffff" stroke-width="2"/>
          <!-- Parabrisa dianteiro -->
          <rect x="18" y="15" width="12" height="7" rx="2" fill="#09090b" opacity="0.95"/>
          <!-- Teto Solar -->
          <rect x="19" y="24" width="10" height="4" rx="1" fill="#713f12" opacity="0.8"/>
          <!-- Vidro Traseiro -->
          <rect x="18" y="30" width="12" height="5" rx="1.5" fill="#09090b" opacity="0.95"/>
          <!-- Faróis dianteiros acesos -->
          <circle cx="17" cy="9" r="2" fill="#fef08a"/>
          <circle cx="31" cy="9" r="2" fill="#fef08a"/>
          <!-- Lanternas traseiras -->
          <circle cx="17" cy="41" r="2" fill="#ef4444"/>
          <circle cx="31" cy="41" r="2" fill="#ef4444"/>
        </svg>
        <!-- Tag de Placa e Velocidade horizontal -->
        <div style="transform: rotate(-${carHeading}deg); transition: transform 0.4s ease-out;" class="absolute -bottom-5 whitespace-nowrap bg-black/90 text-[#ff6a00] font-mono font-bold text-[9px] px-1.5 py-0.2 rounded border border-[#ff6a00]/80 shadow-2xl">
          ${effectiveDriver.vehiclePlate} • ${speedKmh} km/h
        </div>
      </div>
    `;

    const carIcon = L.divIcon({
      className: 'driver-rotating-car-marker',
      html: carHtml,
      iconSize: [44, 44],
      iconAnchor: [22, 22],
    });

    if (driverMarkerRef.current) {
      driverMarkerRef.current.setLatLng(carPos);
      driverMarkerRef.current.setIcon(carIcon);
    } else {
      driverMarkerRef.current = L.marker(carPos, { icon: carIcon }).addTo(map);
    }
  }, [carPos, carHeading, speedKmh, effectiveDriver.vehiclePlate]);

  // 6. Atualização segura de posição para o componente pai (App)
  useEffect(() => {
    if (onUpdateDriverPosition) {
      onUpdateDriverPosition({ lat: carPos[0], lng: carPos[1] });
    }
  }, [carPos, onUpdateDriverPosition]);

  // 7. Timer em tempo real a cada 1 segundo (tempo diminuindo continuamente)
  useEffect(() => {
    if (hasDriverArrived || isRideFinished) return;

    const secInterval = setInterval(() => {
      setSecondsRemaining((prevSec) => {
        if (prevSec <= 1) {
          return 0;
        }
        return prevSec - 1;
      });
    }, 1000);

    return () => clearInterval(secInterval);
  }, [hasDriverArrived, isRideFinished]);

  // 8. Simulação do Carro nas ruas: anda nas ruas reais e GIRA na esquina a cada 2s
  useEffect(() => {
    if (hasDriverArrived || isRideFinished) return;

    const moveInterval = setInterval(() => {
      const coords = routeData.coordinates;
      if (coords.length === 0) return;

      const prev = stepRef.current;
      const next = prev + 1;

      if (next >= coords.length) {
        stepRef.current = coords.length - 1;
        setHasDriverArrived(true);
        setDistanceRemainingMeters(0);
        setSecondsRemaining(0);
        setSpeedKmh(0);
        clearInterval(moveInterval);
        return;
      }

      stepRef.current = next;
      setCurrentStepIndex(next);

      const pCurrent = coords[prev];
      const pNext = coords[next];
      setCarPos(pNext);

      // Calcula o ângulo exato para a curva na esquina (rotateMarker)
      const heading = calculateBearing(pCurrent[0], pCurrent[1], pNext[0], pNext[1]);
      setCarHeading(heading);

      // Velocidade realista (reduz na curva fechada, acelera nas avenidas de Indaiatuba)
      const angleDiff = Math.abs(heading - carHeading);
      const isCurve = angleDiff > 35;
      const dynamicSpeed = isCurve ? 24 : Math.floor(40 + Math.random() * 8);
      setSpeedKmh(dynamicSpeed);

      // Distância proporcional
      const remainingPct = (coords.length - 1 - next) / (coords.length - 1);
      const distLeft = Math.round(remainingPct * routeData.totalDistanceMeters);
      setDistanceRemainingMeters(distLeft);
    }, 2000);

    return () => clearInterval(moveInterval);
  }, [routeData, carHeading, hasDriverArrived, isRideFinished]);

  // Cálculo da instrução da próxima curva para o HUD de GPS estilo Uber
  const steps = routeData.steps;
  const currentStep = (() => {
    if (hasDriverArrived) {
      return {
        instruction: 'Motorista chegou ao local!',
        street: 'Parque Ecológico de Indaiatuba',
        modifier: 'arrive',
      };
    }
    if (distanceRemainingMeters <= 200) {
      return {
        instruction: 'Motorista está virando a esquina para o embarque',
        street: 'Embarque em 200m à direita',
        modifier: 'right',
      };
    }
    const ratio = currentStepIndex / (routeData.coordinates.length || 1);
    const stepIdx = Math.min(Math.floor(ratio * steps.length), steps.length - 1);
    const active = steps[stepIdx] || steps[0];
    return {
      instruction: active.instruction,
      street: active.streetName,
      modifier: active.modifier || 'straight',
    };
  })();

  const minutesLeft = Math.max(Math.ceil(secondsRemaining / 60), 0);
  const distanceKmFormatted = (distanceRemainingMeters / 1000).toFixed(1);

  // Iniciar Corrida
  const handleStartRide = () => {
    setHasDriverArrived(false);
    setIsRideInProgress(true);
    setSecondsRemaining(240);
    setDistanceRemainingMeters(3200);
    if (mapInstanceRef.current) {
      mapInstanceRef.current.setView(carPos, 16, { animate: true });
    }
  };

  // Ver corrida completa
  const handleViewFullRoute = () => {
    if (!mapInstanceRef.current) return;
    const bounds = L.latLngBounds(routeData.coordinates);
    mapInstanceRef.current.fitBounds(bounds, { padding: [60, 60], animate: true });

    if (!fullPolylineRef.current) {
      fullPolylineRef.current = L.polyline(routeData.coordinates, {
        color: '#ff6a00',
        weight: 6,
        dashArray: '8, 8',
        opacity: 0.85,
      }).addTo(mapInstanceRef.current);
    }
  };

  // Centralizar no carro
  const handleCenterOnCar = () => {
    if (!mapInstanceRef.current) return;
    mapInstanceRef.current.setView(carPos, 16, { animate: true });
  };

  return (
    <div className="fixed inset-0 z-50 bg-[#000000] text-white flex flex-col w-screen h-screen overflow-hidden select-none">
      {/* 1. HUD SUPERIOR ESTILO UBER: PRÓXIMA ESQUINA & MANOBRA */}
      <div className="absolute top-4 left-4 right-4 z-[1000] flex items-start justify-between gap-3 pointer-events-none">
        {/* Botão VOLTAR */}
        <button
          type="button"
          onClick={onClose}
          className="pointer-events-auto bg-[#ff6a00] hover:bg-[#e05e00] active:scale-95 text-white font-heading font-black text-xs sm:text-sm py-2.5 px-4 rounded-2xl shadow-2xl flex items-center gap-2 transition-all cursor-pointer border border-[#ff8533]"
        >
          <ArrowLeft className="w-4 h-4 sm:w-5 sm:h-5 stroke-[3]" />
          <span>VOLTAR</span>
        </button>

        {/* Card Superior Estilo Uber / Waze de Direção */}
        <div className="pointer-events-auto flex-1 max-w-md bg-black/90 backdrop-blur-xl border-2 border-zinc-800 text-white rounded-2xl p-3 shadow-2xl flex items-center gap-3">
          <div className="w-10 h-10 rounded-xl bg-[#ff6a00] text-white flex items-center justify-center shrink-0 shadow-md">
            {currentStep.modifier === 'right' ? (
              <CornerUpRight className="w-6 h-6 stroke-[3]" />
            ) : currentStep.modifier === 'left' ? (
              <CornerUpLeft className="w-6 h-6 stroke-[3]" />
            ) : (
              <ArrowUp className="w-6 h-6 stroke-[3]" />
            )}
          </div>
          <div className="overflow-hidden">
            <span className="text-[10px] font-mono font-bold text-[#ff6a00] uppercase block tracking-wider">
              {distanceRemainingMeters <= 200 ? 'CHEGANDO NO EMBARQUE' : 'MANOBRA GPS'}
            </span>
            <h3 className="font-heading font-black text-xs sm:text-sm text-white truncate">
              {currentStep.instruction}
            </h3>
            <p className="text-[11px] text-zinc-400 font-medium truncate">
              {currentStep.street}
            </p>
          </div>
        </div>

        {/* Badge Velocímetro & Indaiatuba */}
        <div className="pointer-events-auto hidden sm:flex items-center gap-2 bg-black/85 backdrop-blur-md px-3.5 py-2 rounded-2xl border border-zinc-800 text-xs">
          <Gauge className="w-4 h-4 text-[#ff6a00]" />
          <span className="font-mono font-bold text-white">{speedKmh} km/h</span>
        </div>
      </div>

      {/* BOTÕES RÁPIDOS LATERAIS */}
      <div className="absolute top-24 right-4 z-[1000] flex flex-col gap-2.5">
        <button
          type="button"
          onClick={handleCenterOnCar}
          className="w-11 h-11 bg-black/90 hover:bg-[#ff6a00] border border-zinc-800 active:scale-95 text-[#ff6a00] hover:text-white rounded-2xl shadow-2xl flex items-center justify-center transition-all cursor-pointer"
          title="Centralizar no Carro"
        >
          <Crosshair className="w-5 h-5" />
        </button>

        <button
          type="button"
          onClick={handleViewFullRoute}
          className="w-11 h-11 bg-black/90 hover:bg-[#ff6a00] border border-zinc-800 active:scale-95 text-amber-400 hover:text-white rounded-2xl shadow-2xl flex items-center justify-center transition-all cursor-pointer"
          title="Ver Trajeto Total de Indaiatuba"
        >
          <Route className="w-5 h-5" />
        </button>
      </div>

      {/* MAPA FULLSCREEN LEAFLET RESTRICTO A INDAIATUBA */}
      <div ref={mapContainerRef} className="w-full h-full flex-1 z-0" />

      {/* 3. CARD DE GPS EM TEMPO REAL ESTILO UBER (EMBAIXO DO MAPA) */}
      <div className="absolute bottom-4 sm:bottom-6 left-3 right-3 sm:left-6 sm:right-6 max-w-lg mx-auto z-[1000] pointer-events-auto">
        <div className="bg-zinc-950/95 backdrop-blur-2xl border-2 border-zinc-800 text-white rounded-3xl p-4 sm:p-5 shadow-[0_12px_40px_rgba(0,0,0,0.85)] space-y-3.5">
          {/* Header do Card com Status */}
          <div className="flex items-center justify-between gap-2 border-b border-zinc-800/80 pb-3">
            <div className="flex items-center gap-3">
              <div className="w-11 h-11 rounded-2xl bg-[#ff6a00]/20 border border-[#ff6a00]/40 flex items-center justify-center text-[#ff6a00] font-black shrink-0">
                <Car className="w-6 h-6" />
              </div>
              <div>
                <h4 className="font-heading font-black text-sm sm:text-base text-white">
                  {hasDriverArrived
                    ? '📍 Motorista Chegou ao Local!'
                    : distanceRemainingMeters <= 200
                    ? '🚨 Motorista está chegando - 200m'
                    : '🚗 Motorista a Caminho'}
                </h4>
                <p className="text-xs text-zinc-400 font-medium">
                  {effectiveDriver.vehicleModel} &bull;{' '}
                  <strong className="text-white font-mono bg-zinc-800 px-1.5 py-0.5 rounded text-[11px]">
                    {effectiveDriver.vehiclePlate}
                  </strong>
                </p>
              </div>
            </div>

            {/* Distância e tempo grande estilo Uber */}
            <div className="text-right">
              <div className="text-xl sm:text-2xl font-heading font-black text-[#ff6a00]">
                {minutesLeft > 0 ? `${minutesLeft} min` : 'Agora'}
              </div>
              <div className="text-[11px] font-mono text-zinc-400">
                {distanceKmFormatted} km restantes
              </div>
            </div>
          </div>

          {/* ALERTA ESPECIAL QUANDO CHEGAR PERTO: "Motorista está chegando - 200m" */}
          {distanceRemainingMeters <= 200 && !hasDriverArrived && (
            <div className="bg-amber-950/70 border-2 border-[#ff6a00] rounded-2xl p-3 flex items-center gap-3 animate-pulse">
              <div className="w-8 h-8 rounded-full bg-[#ff6a00] text-black flex items-center justify-center shrink-0">
                <BellRing className="w-4 h-4 stroke-[2.5]" />
              </div>
              <div>
                <span className="font-heading font-black text-xs sm:text-sm text-white block">
                  Motorista está chegando - 200m
                </span>
                <span className="text-[11px] text-amber-200 font-medium">
                  Dirija-se ao ponto de embarque na calçada
                </span>
              </div>
            </div>
          )}

          {/* QUANDO CHEGAR A 0m: "Motorista chegou!" + botão "Iniciar corrida" */}
          {hasDriverArrived && !isRideInProgress && (
            <div className="bg-emerald-950/60 border border-emerald-500/50 rounded-2xl p-4 text-center space-y-3">
              <div className="flex items-center justify-center gap-2 text-emerald-400 font-heading font-black text-base sm:text-lg">
                <CheckCircle2 className="w-5 h-5" />
                <span>Motorista Chegou!</span>
              </div>
              <p className="text-xs text-zinc-300 font-medium">
                O veículo prata ({effectiveDriver.vehiclePlate}) está te aguardando no local.
              </p>
              <button
                type="button"
                onClick={handleStartRide}
                className="w-full py-3.5 bg-[#ff6a00] hover:bg-[#e05e00] active:scale-95 text-white font-heading font-black text-sm sm:text-base rounded-2xl shadow-xl transition-all cursor-pointer border border-[#ff8533] flex items-center justify-center gap-2"
              >
                <Play className="w-5 h-5 fill-white" />
                <span>INICIAR CORRIDA</span>
              </button>
            </div>
          )}

          {/* Botões de Ação na Base */}
          <div className="flex items-center gap-2 pt-1">
            <button
              type="button"
              onClick={handleViewFullRoute}
              className="flex-1 py-2.5 px-3 bg-zinc-900 hover:bg-zinc-800 text-amber-400 border border-zinc-700 font-heading font-bold text-xs rounded-xl transition-all cursor-pointer flex items-center justify-center gap-2"
            >
              <Route className="w-4 h-4 text-[#ff6a00]" />
              <span>Ver trajeto total</span>
            </button>

            <button
              type="button"
              onClick={handleCenterOnCar}
              className="py-2.5 px-4 bg-zinc-800 hover:bg-zinc-700 text-white font-heading font-bold text-xs rounded-xl transition-all cursor-pointer flex items-center gap-1.5"
            >
              <Crosshair className="w-4 h-4" />
              <span>Seguir Carro</span>
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};
