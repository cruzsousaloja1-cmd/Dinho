import React, { useEffect, useRef, useState } from 'react';
import L from 'leaflet';
import { Driver, LocationPoint, Ride } from '../types';
import { 
  ArrowLeft, 
  Crosshair, 
  Navigation, 
  MapPin, 
  CheckCircle2, 
  Play, 
  Route, 
  Clock, 
  Compass,
  Car
} from 'lucide-react';
import { 
  INDAIATUBA_CENTER_COORDS, 
  INDAIATUBA_BOUNDS, 
  INDAIATUBA_MIN_ZOOM, 
  INDAIATUBA_MAX_ZOOM, 
  INDAIATUBA_DEFAULT_ZOOM,
  SIMULATED_INDAIATUBA_ROUTE 
} from '../config/indaiatuba';

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

  // Embarque em Indaiatuba (Padrão: Parque Ecológico / Centro de Indaiatuba)
  const defaultPickupLat = pickup?.lat ?? -23.0955;
  const defaultPickupLng = pickup?.lng ?? -47.2250;

  // Destino em Indaiatuba (Padrão: Jardim Morada do Sol)
  const defaultDestLat = destination?.lat ?? -23.1180;
  const defaultDestLng = destination?.lng ?? -47.2380;

  // Ponto de início do carro: Av. Presidente Vargas, Indaiatuba
  const startCarLat = -23.0842;
  const startCarLng = -47.2118;

  // Informações do condutor
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

  // Trajeto do carro em direção ao passageiro (fatia 1 da rota de Indaiatuba)
  const approachRoute = SIMULATED_INDAIATUBA_ROUTE.slice(0, 8); // Av. Presidente Vargas -> Parque Ecológico
  // Trajeto completo da corrida (fatia 2: Parque Ecológico -> Morada do Sol)
  const tripRoute = SIMULATED_INDAIATUBA_ROUTE;

  // Estados de simulação da corrida
  const stepRef = useRef(0);
  const [currentStep, setCurrentStep] = useState(0);
  const [carPos, setCarPos] = useState<{ lat: number; lng: number }>(() => {
    if (driverPosition) return driverPosition;
    return { lat: approachRoute[0][0], lng: approachRoute[0][1] };
  });

  const [hasDriverArrived, setHasDriverArrived] = useState(false);
  const [isRideInProgress, setIsRideInProgress] = useState(false);
  const [isRideFinished, setIsRideFinished] = useState(false);

  // Métricas em tempo real
  const [minutesLeft, setMinutesLeft] = useState(4);
  const [distanceLeft, setDistanceLeft] = useState(1.8);
  const [progressPercent, setProgressPercent] = useState(0);

  // 1. Inicializar o Leaflet com maxBounds estrito para Indaiatuba-SP
  useEffect(() => {
    if (!mapContainerRef.current) return;

    if (!mapInstanceRef.current) {
      const map = L.map(mapContainerRef.current, {
        center: INDAIATUBA_CENTER_COORDS,
        zoom: INDAIATUBA_DEFAULT_ZOOM,
        minZoom: INDAIATUBA_MIN_ZOOM,
        maxZoom: INDAIATUBA_MAX_ZOOM,
        maxBounds: INDAIATUBA_BOUNDS,
        maxBoundsViscosity: 1.0, // Impede o passageiro de arrastar para fora de Indaiatuba
        zoomControl: false,
      });

      // Tile Layer OpenStreetMap / CARTO escuro para a identidade preta e laranja do RACE
      L.tileLayer('https://{s}.basemaps.cartocdn.com/dark_all/{z}/{x}/{y}{r}.png', {
        attribution: '&copy; OpenStreetMap contributors &copy; CARTO',
        subdomains: 'abcd',
        maxZoom: 19,
      }).addTo(map);

      // Controle de Zoom no canto superior direito
      L.control.zoom({ position: 'topright' }).addTo(map);

      mapInstanceRef.current = map;

      // Invalida tamanho para garantir renderização perfeita
      setTimeout(() => {
        map.invalidateSize();
      }, 200);
    }

    return () => {
      if (mapInstanceRef.current) {
        mapInstanceRef.current.remove();
        mapInstanceRef.current = null;
      }
    };
  }, []);

  // 2. Marcador Azul do Passageiro
  useEffect(() => {
    const map = mapInstanceRef.current;
    if (!map) return;

    const pLat = pickup?.lat ?? defaultPickupLat;
    const pLng = pickup?.lng ?? defaultPickupLng;

    const passengerHtml = `
      <div class="relative flex flex-col items-center">
        <div class="absolute -top-1 w-10 h-10 rounded-full bg-blue-500/30 animate-ping"></div>
        <div class="relative w-9 h-9 rounded-full bg-blue-600 border-2 border-white shadow-2xl flex items-center justify-center text-white text-base">
          👤
        </div>
        <div class="bg-blue-950 text-blue-200 text-[11px] px-2.5 py-0.5 rounded-full border border-blue-400 mt-1 font-bold whitespace-nowrap shadow-xl">
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
  }, [pickup]);

  // 3. Marcador Destino (se houver)
  useEffect(() => {
    const map = mapInstanceRef.current;
    if (!map) return;

    const dLat = destination?.lat ?? defaultDestLat;
    const dLng = destination?.lng ?? defaultDestLng;

    const destHtml = `
      <div class="relative flex flex-col items-center">
        <div class="w-8 h-8 rounded-full bg-amber-500 text-slate-950 font-black flex items-center justify-center border-2 border-white shadow-xl text-sm">
          🏁
        </div>
        <div class="bg-black/90 text-amber-400 text-[10px] px-2 py-0.5 rounded-md border border-amber-400 mt-1 font-bold whitespace-nowrap shadow-xl">
          Destino: Morada do Sol
        </div>
      </div>
    `;

    const destIcon = L.divIcon({
      className: 'dest-full-marker',
      html: destHtml,
      iconSize: [36, 44],
      iconAnchor: [18, 22],
    });

    if (destMarkerRef.current) {
      destMarkerRef.current.setLatLng([dLat, dLng]);
    } else {
      destMarkerRef.current = L.marker([dLat, dLng], { icon: destIcon }).addTo(map);
    }
  }, [destination]);

  // 4. Marcador Laranja #ff6a00 do Carro se movendo + Polyline da rota
  useEffect(() => {
    const map = mapInstanceRef.current;
    if (!map) return;

    const driverHtml = `
      <div class="relative flex items-center justify-center">
        <div class="absolute w-12 h-12 rounded-full bg-[#ff6a00]/35 animate-ping"></div>
        <div class="relative w-10 h-10 rounded-full shadow-2xl bg-[#ff6a00] border-2 border-white flex items-center justify-center text-white text-xl">
          🚗
        </div>
        <span class="absolute -bottom-6 text-[10px] whitespace-nowrap bg-black text-[#ff6a00] px-2 py-0.5 rounded font-mono font-bold border border-[#ff6a00]/60 shadow-2xl">
          ${effectiveDriver.vehiclePlate}
        </span>
      </div>
    `;

    const driverIcon = L.divIcon({
      className: 'driver-car-marker',
      html: driverHtml,
      iconSize: [44, 44],
      iconAnchor: [22, 22],
    });

    if (driverMarkerRef.current) {
      driverMarkerRef.current.setLatLng([carPos.lat, carPos.lng]);
    } else {
      driverMarkerRef.current = L.marker([carPos.lat, carPos.lng], { icon: driverIcon }).addTo(map);
    }

    // Traçado da rota percorrida até o momento
    const traveledPoints: [number, number][] = approachRoute.slice(0, currentStep + 1);
    traveledPoints[traveledPoints.length - 1] = [carPos.lat, carPos.lng];

    if (routePolylineRef.current) {
      routePolylineRef.current.setLatLngs(traveledPoints);
    } else {
      routePolylineRef.current = L.polyline(traveledPoints, {
        color: '#ff6a00',
        weight: 6,
        opacity: 0.95,
        lineCap: 'round',
        lineJoin: 'round',
      }).addTo(map);
    }
  }, [carPos, currentStep]);

  // 5. Atualiza posição do motorista no componente pai (App) de forma segura através de useEffect (nunca durante render)
  useEffect(() => {
    if (onUpdateDriverPosition) {
      onUpdateDriverPosition(carPos);
    }
  }, [carPos, onUpdateDriverPosition]);

  // 6. Simulação do Carro em Movimento a Cada 2 Segundos nas Ruas Reais de Indaiatuba
  useEffect(() => {
    if (hasDriverArrived || isRideFinished) return;

    const interval = setInterval(() => {
      const prevStep = stepRef.current;
      const nextStep = prevStep + 1;

      if (!isRideInProgress) {
        // Fase 1: Carro vindo da Av. Presidente Vargas em direção ao Passageiro (Parque Ecológico)
        if (nextStep >= approachRoute.length) {
          stepRef.current = approachRoute.length - 1;
          setHasDriverArrived(true);
          setMinutesLeft(0);
          setDistanceLeft(0);
          setProgressPercent(100);
          clearInterval(interval);
          return;
        }

        stepRef.current = nextStep;
        setCurrentStep(nextStep);
        const targetCoord = approachRoute[nextStep];
        setCarPos({ lat: targetCoord[0], lng: targetCoord[1] });

        // Cálculos proporcionais de tempo e distância
        const remainingSteps = approachRoute.length - 1 - nextStep;
        const pct = Math.round((nextStep / (approachRoute.length - 1)) * 100);
        setProgressPercent(pct);
        setMinutesLeft(Math.max(Math.ceil((remainingSteps / (approachRoute.length - 1)) * 4), 1));
        setDistanceLeft(Math.max(parseFloat(((remainingSteps / (approachRoute.length - 1)) * 1.8).toFixed(1)), 0.1));
      } else {
        // Fase 2: Corrida iniciada, carro levando passageiro ao destino final (Morada do Sol)
        const tripFullSteps = tripRoute.length;
        if (nextStep >= tripFullSteps) {
          stepRef.current = tripFullSteps - 1;
          setIsRideFinished(true);
          setMinutesLeft(0);
          setDistanceLeft(0);
          setProgressPercent(100);
          clearInterval(interval);
          return;
        }

        stepRef.current = nextStep;
        setCurrentStep(nextStep);
        const targetCoord = tripRoute[nextStep];
        setCarPos({ lat: targetCoord[0], lng: targetCoord[1] });

        const remainingSteps = tripFullSteps - 1 - nextStep;
        const pct = Math.round((nextStep / (tripFullSteps - 1)) * 100);
        setProgressPercent(pct);
        setMinutesLeft(Math.max(Math.ceil(remainingSteps / 4), 1));
        setDistanceLeft(Math.max(parseFloat((remainingSteps * 0.4).toFixed(1)), 0.2));
      }
    }, 2000); // 2 segundos conforme requisito estrito

    return () => clearInterval(interval);
  }, [hasDriverArrived, isRideInProgress, isRideFinished]);

  // Ação de Iniciar Corrida após motorista chegar
  const handleStartRide = () => {
    stepRef.current = approachRoute.length - 1;
    setHasDriverArrived(false);
    setIsRideInProgress(true);
    setCurrentStep(approachRoute.length - 1);
    setMinutesLeft(6);
    setDistanceLeft(3.4);
    setProgressPercent(0);

    // Ajusta o mapa para a nova rota rumo ao Jardim Morada do Sol
    if (mapInstanceRef.current) {
      const bounds = L.latLngBounds(tripRoute);
      mapInstanceRef.current.fitBounds(bounds, { padding: [50, 50], animate: true });
    }
  };

  // Botão "Ver Corrida Completa" que enquadra o trajeto total em Indaiatuba
  const handleViewFullRoute = () => {
    if (!mapInstanceRef.current) return;
    const bounds = L.latLngBounds(tripRoute);
    mapInstanceRef.current.fitBounds(bounds, { padding: [60, 60], animate: true });

    // Desenha a rota total contínua tracejada
    if (!fullPolylineRef.current) {
      fullPolylineRef.current = L.polyline(tripRoute, {
        color: '#ff6a00',
        weight: 5,
        dashArray: '8, 8',
        opacity: 0.8,
      }).addTo(mapInstanceRef.current);
    }
  };

  // Centralizar mapa no carro em movimento
  const handleCenterOnCar = () => {
    if (!mapInstanceRef.current) return;
    mapInstanceRef.current.setView([carPos.lat, carPos.lng], 16, { animate: true });
  };

  // Centralizar na cidade toda de Indaiatuba
  const handleCenterIndaiatuba = () => {
    if (!mapInstanceRef.current) return;
    mapInstanceRef.current.setView(INDAIATUBA_CENTER_COORDS, INDAIATUBA_DEFAULT_ZOOM, { animate: true });
  };

  return (
    <div className="fixed inset-0 z-50 bg-[#000000] text-white flex flex-col w-screen h-screen overflow-hidden select-none">
      {/* Barra de Controles Superiores Flutuante */}
      <div className="absolute top-4 left-4 right-4 z-[1000] flex items-center justify-between pointer-events-none">
        {/* Botão VOLTAR */}
        <button
          type="button"
          onClick={onClose}
          className="pointer-events-auto bg-[#ff6a00] hover:bg-[#e05e00] active:scale-95 text-white font-heading font-black text-xs sm:text-sm py-2.5 px-4 rounded-2xl shadow-2xl flex items-center gap-2 transition-all cursor-pointer border border-[#ff8533]"
        >
          <ArrowLeft className="w-4 h-4 sm:w-5 sm:h-5 stroke-[3]" />
          <span>VOLTAR</span>
        </button>

        {/* Badge Cidade: Indaiatuba - SP */}
        <div className="pointer-events-auto bg-black/85 backdrop-blur-md px-3.5 py-2 rounded-2xl border border-zinc-800 text-xs text-zinc-300 flex items-center gap-2 shadow-2xl">
          <span className="w-2.5 h-2.5 rounded-full bg-emerald-500 radar-pulse" />
          <span className="font-heading font-black text-white text-xs sm:text-sm">
            INDAIATUBA - SP
          </span>
          <span className="text-[11px] font-mono text-[#ff6a00] border-l border-zinc-700 pl-2">
            GPS 100% Ativo
          </span>
        </div>
      </div>

      {/* Botões de Ação Rápida no Canto Direito (Centralizar no Carro & Ver Indaiatuba Toda) */}
      <div className="absolute top-20 right-4 z-[1000] flex flex-col gap-2.5">
        <button
          type="button"
          onClick={handleCenterOnCar}
          className="w-11 h-11 bg-black/90 hover:bg-[#ff6a00] border border-zinc-800 hover:border-[#ff8533] active:scale-95 text-[#ff6a00] hover:text-white rounded-2xl shadow-2xl flex items-center justify-center transition-all cursor-pointer"
          title="Seguir Carro em Movimento"
        >
          <Crosshair className="w-5 h-5" />
        </button>

        <button
          type="button"
          onClick={handleCenterIndaiatuba}
          className="w-11 h-11 bg-black/90 hover:bg-zinc-800 border border-zinc-800 active:scale-95 text-zinc-300 hover:text-white rounded-2xl shadow-2xl flex items-center justify-center transition-all cursor-pointer"
          title="Ver Toda Indaiatuba"
        >
          <Compass className="w-5 h-5" />
        </button>

        <button
          type="button"
          onClick={handleViewFullRoute}
          className="w-11 h-11 bg-black/90 hover:bg-[#ff6a00] border border-zinc-800 hover:border-[#ff8533] active:scale-95 text-amber-400 hover:text-white rounded-2xl shadow-2xl flex items-center justify-center transition-all cursor-pointer"
          title="Ver Trajeto Total de Indaiatuba"
        >
          <Route className="w-5 h-5" />
        </button>
      </div>

      {/* Mapa Leaflet Grande Ocupando 100% da Altura e Largura Restrito a Indaiatuba */}
      <div ref={mapContainerRef} className="w-full h-full flex-1 z-0" />

      {/* 3. CARD DE TEMPO EM TEMPO REAL EMBAIXO DO MAPA FULLSCREEN */}
      <div className="absolute bottom-4 sm:bottom-6 left-3 right-3 sm:left-6 sm:right-6 max-w-lg mx-auto z-[1000] pointer-events-auto">
        <div className="bg-zinc-950/95 backdrop-blur-2xl border-2 border-zinc-800 text-white rounded-3xl p-4 sm:p-5 shadow-[0_12px_40px_rgba(0,0,0,0.8)] space-y-3.5">
          {/* Header do Card com Estado */}
          <div className="flex items-center justify-between gap-2 border-b border-zinc-800/80 pb-3">
            <div className="flex items-center gap-2.5">
              <div className="w-10 h-10 rounded-2xl bg-[#ff6a00]/20 border border-[#ff6a00]/40 flex items-center justify-center text-[#ff6a00] font-black shrink-0">
                <Car className="w-5 h-5" />
              </div>
              <div>
                <h4 className="font-heading font-black text-sm sm:text-base text-white">
                  {isRideFinished
                    ? '🎉 Corrida Concluída em Indaiatuba!'
                    : hasDriverArrived
                    ? '📍 Motorista Chegou ao Ponto de Embarque!'
                    : isRideInProgress
                    ? '🚀 Corrida em Andamento para o Destino'
                    : '🚗 Motorista a Caminho'}
                </h4>
                <p className="text-xs text-zinc-400 font-medium">
                  {effectiveDriver.vehicleModel} &bull; Placa:{' '}
                  <strong className="text-white font-mono bg-zinc-800 px-1.5 py-0.5 rounded text-[11px]">
                    {effectiveDriver.vehiclePlate}
                  </strong>
                </p>
              </div>
            </div>

            {/* Status Indicator */}
            <span
              className={`text-[11px] font-mono font-bold px-2.5 py-1 rounded-full border ${
                hasDriverArrived || isRideFinished
                  ? 'bg-emerald-950 text-emerald-400 border-emerald-500/50'
                  : 'bg-amber-950/80 text-[#ff6a00] border-[#ff6a00]/40'
              }`}
            >
              {hasDriverArrived ? 'NO LOCAL' : isRideFinished ? 'FINALIZADA' : 'EM TRÂNSITO'}
            </span>
          </div>

          {/* Se o motorista AINDA NÃO chegou: exibe tempo, distância e barra de progresso */}
          {!hasDriverArrived && !isRideFinished && (
            <div className="space-y-2.5">
              <div className="flex items-center justify-between text-xs sm:text-sm">
                <span className="font-heading font-black text-white text-base sm:text-lg flex items-center gap-1.5 text-[#ff6a00]">
                  <Clock className="w-4 h-4 animate-pulse" />
                  <span>
                    {minutesLeft > 0
                      ? `Chega em ${minutesLeft} min`
                      : 'Chegando agora mesmo!'}
                  </span>
                </span>
                <span className="font-mono font-bold text-zinc-300 bg-zinc-900 px-2.5 py-1 rounded-lg border border-zinc-800">
                  Distância: <strong className="text-white">{distanceLeft.toFixed(1)} km</strong>
                </span>
              </div>

              {/* Barra de Progresso da Viagem */}
              <div className="space-y-1">
                <div className="w-full bg-zinc-900 rounded-full h-3 overflow-hidden border border-zinc-800 p-0.5">
                  <div
                    className="bg-gradient-to-r from-amber-500 via-[#ff6a00] to-orange-400 h-full rounded-full transition-all duration-700 ease-out shadow-[0_0_12px_rgba(255,106,0,0.8)]"
                    style={{ width: `${progressPercent}%` }}
                  />
                </div>
                <div className="flex justify-between text-[10px] text-zinc-500 font-mono">
                  <span>Partida: Av. Presidente Vargas</span>
                  <span>{progressPercent}% percorrido</span>
                  <span>Chegada: Parque Ecológico</span>
                </div>
              </div>
            </div>
          )}

          {/* QUANDO CHEGAR A 0 MIN: Mostrar "Motorista chegou!" + botão "Iniciar corrida" */}
          {hasDriverArrived && !isRideInProgress && (
            <div className="bg-emerald-950/50 border border-emerald-500/40 rounded-2xl p-4 text-center space-y-3">
              <div className="flex items-center justify-center gap-2 text-emerald-400 font-heading font-black text-base sm:text-lg">
                <CheckCircle2 className="w-5 h-5 text-emerald-400" />
                <span>Motorista Chegou!</span>
              </div>
              <p className="text-xs text-zinc-300 font-medium">
                O veículo está te aguardando no Parque Ecológico de Indaiatuba.
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

          {/* 4. NA CHEGADA FINAL: Mostrar mapa completo de Indaiatuba com rota completa percorrida + Botão "Ver corrida completa" */}
          {(isRideFinished || hasDriverArrived || isRideInProgress) && (
            <div className="flex items-center gap-2 pt-1">
              <button
                type="button"
                onClick={handleViewFullRoute}
                className="flex-1 py-2.5 px-3 bg-zinc-900 hover:bg-zinc-800 text-amber-400 border border-zinc-700 font-heading font-bold text-xs rounded-xl transition-all cursor-pointer flex items-center justify-center gap-2"
              >
                <Route className="w-4 h-4 text-[#ff6a00]" />
                <span>Ver corrida completa</span>
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
          )}
        </div>
      </div>
    </div>
  );
};
