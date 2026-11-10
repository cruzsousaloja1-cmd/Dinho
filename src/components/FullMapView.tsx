import React, { useEffect, useRef, useState } from 'react';
import L from 'leaflet';
import 'leaflet/dist/leaflet.css';
import { Driver, LocationPoint, Ride } from '../types';
import { 
  ArrowLeft, 
  Crosshair, 
  CornerUpRight, 
  CornerUpLeft, 
  ArrowUp, 
  Route, 
  Clock, 
  CheckCircle2, 
  Play, 
  Car,
  BellRing,
  Navigation,
  Volume2,
  VolumeX,
  Check,
  Phone
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
  INDAIATUBA_REAL_STREET_COORDINATES, 
  INDAIATUBA_REAL_STEPS 
} from '../services/osrmRoutingService';
import {
  isAudioEnabled,
  toggleAudio,
  notifyDriverArrived,
  notifyDriverAccepted,
  notifyRideFinished,
  playChimeSound,
  speakText
} from '../services/audioNotificationService';

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

  // Coordenadas padrão em Indaiatuba - SP
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

  // Rota real consultada via OSRM com ruas e esquinas de Indaiatuba
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
  const [carHeading, setCarHeading] = useState(209); // Ângulo na Av. Presidente Vargas
  const [speedKmh, setSpeedKmh] = useState(44);
  const [currentStepIndex, setCurrentStepIndex] = useState(0);

  // Estados de navegação estilo Uber
  const [secondsRemaining, setSecondsRemaining] = useState(180);
  const [distanceRemainingMeters, setDistanceRemainingMeters] = useState(1800);
  const [hasDriverArrived, setHasDriverArrived] = useState(false);
  const [isRideInProgress, setIsRideInProgress] = useState(false);
  const [isRideFinished, setIsRideFinished] = useState(false);

  // Estados de Áudio e Voz (Web Speech API + Chime Ding)
  const [audioEnabled, setAudioEnabledState] = useState(() => isAudioEnabled());
  const [audioToast, setAudioToast] = useState<string | null>(null);

  // Verifica se é Motoboy ou Motorista de Carro
  const isMotoboy =
    effectiveDriver.category === 'moto_passageiro' ||
    effectiveDriver.category === 'moto_entrega' ||
    activeRide?.category === 'moto_passageiro' ||
    activeRide?.category === 'moto_entrega';

  // Refs de controle para evitar repetições desnecessárias da voz
  const hasAnnouncedAcceptedRef = useRef(false);
  const hasAnnouncedArrivedRef = useRef(false);
  const hasAnnouncedFinishedRef = useRef(false);

  // Sincroniza estado do áudio com eventos globais
  useEffect(() => {
    const handleSync = (e: any) => {
      if (e?.detail?.enabled !== undefined) {
        setAudioEnabledState(e.detail.enabled);
      } else {
        setAudioEnabledState(isAudioEnabled());
      }
    };
    window.addEventListener('race_audio_toggle', handleSync);
    return () => window.removeEventListener('race_audio_toggle', handleSync);
  }, []);

  // Alterna o áudio (Ligar / Silenciar)
  const handleToggleAudio = () => {
    const next = toggleAudio();
    setAudioEnabledState(next);
    const msg = next ? '🔊 Áudio e Voz Ligados' : '🔇 Áudio Silenciado';
    setAudioToast(msg);
    setTimeout(() => setAudioToast(null), 2500);
    if (next) {
      playChimeSound();
    }
  };

  // Botão para testar o áudio manualmente
  const handleTestAudioArrival = () => {
    notifyDriverArrived(isMotoboy);
    setAudioToast(isMotoboy ? '🔊 "Seu motoboy chegou"' : '🔊 "Seu motorista chegou"');
    setTimeout(() => setAudioToast(null), 3000);
  };

  // 1. Áudio: Quando motorista/motoboy aceitou e está a caminho (ao abrir o mapa com a corrida ativa)
  useEffect(() => {
    if (!hasAnnouncedAcceptedRef.current && (activeRide || !hasDriverArrived)) {
      hasAnnouncedAcceptedRef.current = true;
      notifyDriverAccepted(isMotoboy);
    }
  }, [isMotoboy]);

  // 2. Áudio Automático: Quando chegar no ponto de embarque (distância <= 100m ou hasDriverArrived = true)
  useEffect(() => {
    if ((distanceRemainingMeters <= 100 || hasDriverArrived) && !hasAnnouncedArrivedRef.current) {
      hasAnnouncedArrivedRef.current = true;
      notifyDriverArrived(isMotoboy);
    }
  }, [distanceRemainingMeters, hasDriverArrived, isMotoboy]);

  // 3. Áudio: Quando a corrida terminar
  useEffect(() => {
    if (isRideFinished && !hasAnnouncedFinishedRef.current) {
      hasAnnouncedFinishedRef.current = true;
      notifyRideFinished();
    }
  }, [isRideFinished]);

  // 1. Busca rota real pelas ruas via OSRM ao iniciar
  useEffect(() => {
    let active = true;
    fetchRealStreetRoute(startCarLat, startCarLng, pLat, pLng).then((res) => {
      if (active && res.coordinates.length > 0) {
        setRouteData(res);
        setDistanceRemainingMeters(res.totalDistanceMeters);
        setSecondsRemaining(res.totalDurationSeconds);
        setCarPos(res.coordinates[0]);
      }
    });
    return () => {
      active = false;
    };
  }, [pLat, pLng]);

  // 2. Inicializa Leaflet com OpenStreetMap claro oficial e container BRANCO
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

      // OpenStreetMap Oficial Claro - Ruas de Indaiatuba totalmente visíveis
      L.tileLayer('https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png', {
        attribution: '&copy; OpenStreetMap',
        maxZoom: 19,
      }).addTo(map);

      // Controle de zoom no topo direito
      L.control.zoom({ position: 'topright' }).addTo(map);

      mapInstanceRef.current = map;

      // Invalida o tamanho imediatamente e em intervalos para garantir renderização perfeita
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

  // 3. Desenha a rota grossa laranja #ff6a00 por cima das ruas de Indaiatuba
  useEffect(() => {
    const map = mapInstanceRef.current;
    if (!map || routeData.coordinates.length === 0) return;

    if (routePolylineRef.current) {
      routePolylineRef.current.setLatLngs(routeData.coordinates);
    } else {
      routePolylineRef.current = L.polyline(routeData.coordinates, {
        color: '#ff6a00',
        weight: 8,
        opacity: 0.95,
        lineCap: 'round',
        lineJoin: 'round',
      }).addTo(map);
    }
  }, [routeData]);

  // 4. Marcador Azul Grande do Passageiro
  useEffect(() => {
    const map = mapInstanceRef.current;
    if (!map) return;

    const passengerHtml = `
      <div class="relative flex flex-col items-center">
        <div class="absolute -top-1 w-12 h-12 rounded-full bg-blue-500/30 animate-ping"></div>
        <div class="relative w-11 h-11 rounded-full bg-blue-600 border-3 border-white shadow-2xl flex items-center justify-center text-white text-lg font-bold">
          👤
        </div>
        <div class="bg-blue-600 text-white font-heading font-black text-xs px-3 py-1 rounded-full border-2 border-white mt-1 whitespace-nowrap shadow-xl">
          Passageiro (Você)
        </div>
      </div>
    `;

    const passengerIcon = L.divIcon({
      className: 'passenger-marker-clean',
      html: passengerHtml,
      iconSize: [48, 56],
      iconAnchor: [24, 28],
    });

    if (pickupMarkerRef.current) {
      pickupMarkerRef.current.setLatLng([pLat, pLng]);
    } else {
      pickupMarkerRef.current = L.marker([pLat, pLng], { icon: passengerIcon }).addTo(map);
    }
  }, [pLat, pLng]);

  // 5. Ícone do Carro Grande com Fundo Laranja #ff6a00, Borda Branca, que GIRA nas esquinas
  useEffect(() => {
    const map = mapInstanceRef.current;
    if (!map) return;

    const carHtml = `
      <div class="relative flex flex-col items-center justify-center">
        <!-- Contêiner do Carro com Rotação Dinâmica -->
        <div style="transform: rotate(${carHeading}deg); transition: transform 0.4s ease-out;" class="relative flex items-center justify-center">
          <div class="w-13 h-13 rounded-full bg-[#ff6a00] border-3 border-white shadow-2xl flex items-center justify-center">
            <!-- Seta Direcional na frente -->
            <div class="absolute -top-1 w-0 h-0 border-l-[6px] border-l-transparent border-r-[6px] border-r-transparent border-b-[8px] border-b-white"></div>
            <!-- Carro Top Down em SVG -->
            <svg width="30" height="30" viewBox="0 0 24 24" fill="none" stroke="white" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round">
              <path d="M19 17h2c.6 0 1-.4 1-1v-3c0-.9-.7-1.7-1.5-1.9C18.7 10.6 16 10 16 10s-1.3-1.4-2.2-2.3c-.5-.4-1.1-.7-1.8-.7H5c-.6 0-1.1.4-1.4.9l-1.4 2.9A3.7 3.7 0 0 0 2 12v4c0 .6.4 1 1 1h2" />
              <circle cx="7" cy="17" r="2" fill="white" />
              <circle cx="17" cy="17" r="2" fill="white" />
            </svg>
          </div>
        </div>

        <!-- Placa do Veículo Limpa e Legível -->
        <div class="bg-slate-950 text-[#ff6a00] font-mono font-black text-[10px] px-2.5 py-0.5 rounded-full border-2 border-white shadow-xl mt-1 whitespace-nowrap">
          ${effectiveDriver.vehiclePlate} • ${speedKmh} km/h
        </div>
      </div>
    `;

    const carIcon = L.divIcon({
      className: 'driver-rotating-car-clean',
      html: carHtml,
      iconSize: [52, 64],
      iconAnchor: [26, 32],
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

  // 7. Timer em tempo real a cada 1 segundo (atualiza os segundos decrescendo)
  useEffect(() => {
    if (hasDriverArrived || isRideFinished) return;

    const secInterval = setInterval(() => {
      setSecondsRemaining((prevSec) => {
        if (prevSec <= 1) return 0;
        return prevSec - 1;
      });
    }, 1000);

    return () => clearInterval(secInterval);
  }, [hasDriverArrived, isRideFinished]);

  // 8. Simulação do Carro nas ruas de Indaiatuba: avança e GIRA nas esquinas a cada 2s
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

      // Calcula o ângulo para virar o carro na esquina
      const heading = calculateBearing(pCurrent[0], pCurrent[1], pNext[0], pNext[1]);
      setCarHeading(heading);

      // Velocidade realista (reduz na curva, acelera nas avenidas)
      const angleDiff = Math.abs(heading - carHeading);
      const isCurve = angleDiff > 30;
      const dynamicSpeed = isCurve ? 22 : Math.floor(40 + Math.random() * 8);
      setSpeedKmh(dynamicSpeed);

      // Distância proporcional
      const remainingPct = (coords.length - 1 - next) / (coords.length - 1);
      const distLeft = Math.round(remainingPct * routeData.totalDistanceMeters);
      setDistanceRemainingMeters(distLeft);
    }, 2000);

    return () => clearInterval(moveInterval);
  }, [routeData, carHeading, hasDriverArrived, isRideFinished]);

  // Cálculo da instrução da próxima curva
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
        instruction: 'Motorista virando na rua de embarque',
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
    <div className="fixed inset-0 z-50 bg-white text-slate-900 flex flex-col w-screen h-screen overflow-hidden select-none">
      {/* 1. HUD SUPERIOR ESTILO UBER (PRÓXIMA ESQUINA & MANOBRA) */}
      <div className="absolute top-4 left-4 right-4 z-[1000] flex items-start justify-between gap-3 pointer-events-none">
        {/* Botão VOLTAR */}
        <button
          type="button"
          onClick={onClose}
          className="pointer-events-auto bg-[#ff6a00] hover:bg-[#e05e00] active:scale-95 text-white font-heading font-black text-xs sm:text-sm py-2.5 px-4 rounded-2xl shadow-xl flex items-center gap-2 transition-all cursor-pointer border border-[#ff8533]"
        >
          <ArrowLeft className="w-4 h-4 sm:w-5 sm:h-5 stroke-[3]" />
          <span>VOLTAR</span>
        </button>

        {/* Card Superior Estilo Uber de Direção */}
        <div className="pointer-events-auto flex-1 max-w-md bg-white/95 backdrop-blur-xl border border-slate-200 text-slate-900 rounded-2xl p-3 shadow-xl flex items-center gap-3">
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
            <h3 className="font-heading font-black text-xs sm:text-sm text-slate-900 truncate">
              {currentStep.instruction}
            </h3>
            <p className="text-[11px] text-slate-500 font-medium truncate">
              {currentStep.street}
            </p>
          </div>
        </div>

        {/* Badge Cidade: Indaiatuba - SP */}
        <div className="pointer-events-auto hidden sm:flex items-center gap-2 bg-white/95 backdrop-blur-md px-3.5 py-2 rounded-2xl border border-slate-200 text-xs shadow-md">
          <Navigation className="w-4 h-4 text-[#ff6a00]" />
          <span className="font-heading font-bold text-slate-900">Indaiatuba - SP</span>
        </div>
      </div>

      {/* TOAST DE FEEDBACK DE ÁUDIO */}
      {audioToast && (
        <div className="absolute top-20 left-1/2 -translate-x-1/2 z-[1001] bg-slate-950/90 backdrop-blur-md text-white font-heading font-black text-xs sm:text-sm px-4 py-2 rounded-full shadow-2xl border border-[#ff6a00] flex items-center gap-2 animate-bounce">
          <span>{audioToast}</span>
        </div>
      )}

      {/* BOTÕES RÁPIDOS LATERAIS (ÁUDIO, SEGUIR CARRO E ROTA) */}
      <div className="absolute top-24 right-4 z-[1000] flex flex-col gap-2.5">
        {/* Botão de Som / Voz Ligar/Desligar */}
        <button
          type="button"
          onClick={handleToggleAudio}
          className={`w-11 h-11 border active:scale-95 rounded-2xl shadow-xl flex items-center justify-center transition-all cursor-pointer ${
            audioEnabled
              ? 'bg-[#ff6a00] text-white border-[#ff8533] hover:bg-[#e05e00]'
              : 'bg-white text-slate-400 border-slate-300 hover:text-slate-600 hover:bg-slate-50'
          }`}
          title={audioEnabled ? 'Áudio ATIVADO (clique para mutar)' : 'Áudio MUTADO (clique para ativar som)'}
        >
          {audioEnabled ? <Volume2 className="w-5 h-5 stroke-[2.5]" /> : <VolumeX className="w-5 h-5 stroke-[2.5]" />}
        </button>

        <button
          type="button"
          onClick={handleCenterOnCar}
          className="w-11 h-11 bg-white hover:bg-slate-50 border border-slate-300 active:scale-95 text-[#ff6a00] rounded-2xl shadow-xl flex items-center justify-center transition-all cursor-pointer"
          title="Centralizar no Veículo"
        >
          <Crosshair className="w-5 h-5" />
        </button>

        <button
          type="button"
          onClick={handleViewFullRoute}
          className="w-11 h-11 bg-white hover:bg-slate-50 border border-slate-300 active:scale-95 text-slate-800 hover:text-[#ff6a00] rounded-2xl shadow-xl flex items-center justify-center transition-all cursor-pointer"
          title="Ver Trajeto Total de Indaiatuba"
        >
          <Route className="w-5 h-5" />
        </button>
      </div>

      {/* MAPA FULLSCREEN LEAFLET COM FUNDO BRANCO E RUAS CLARAS */}
      <div 
        ref={mapContainerRef} 
        className="w-full h-full flex-1 z-0 bg-white" 
        style={{ width: '100vw', height: '100vh', background: '#ffffff' }}
      />

      {/* 3. CARD DE GPS EM TEMPO REAL ESTILO UBER (EMBAIXO DO MAPA) */}
      <div className="absolute bottom-4 sm:bottom-6 left-3 right-3 sm:left-6 sm:right-6 max-w-lg mx-auto z-[1000] pointer-events-auto">
        <div className="bg-white/95 backdrop-blur-2xl border border-slate-200 text-slate-900 rounded-3xl p-4 sm:p-5 shadow-[0_12px_40px_rgba(0,0,0,0.15)] space-y-3.5">
          {/* Header do Card com Status, Foto do Motorista e Veículo */}
          <div className="flex items-center justify-between gap-2 border-b border-slate-100 pb-3">
            <div className="flex items-center gap-3">
              <div className="relative shrink-0">
                <img
                  src={effectiveDriver.avatar}
                  alt={effectiveDriver.name}
                  className="w-12 h-12 rounded-full object-cover border-2 border-[#ff6a00] shadow-md"
                />
                <span className="absolute -bottom-1 -right-1 bg-amber-400 text-slate-950 font-black text-[10px] px-1 rounded-full border border-black shadow">
                  ★ {effectiveDriver.rating.toFixed(1)}
                </span>
              </div>
              <div>
                <h4 className="font-heading font-black text-sm sm:text-base text-slate-950 flex items-center gap-1.5">
                  <span>{effectiveDriver.name}</span>
                </h4>
                <p className="text-xs text-slate-600 font-medium">
                  {effectiveDriver.vehicleModel} &bull;{' '}
                  <strong className="text-slate-900 font-mono bg-slate-100 px-1.5 py-0.5 rounded text-[11px] border border-slate-200">
                    {effectiveDriver.vehiclePlate}
                  </strong>
                  {effectiveDriver.vehicleColor ? ` • ${effectiveDriver.vehicleColor}` : ''}
                </p>
              </div>
            </div>

            <div className="flex items-center gap-2">
              <a
                href={`https://wa.me/55${(effectiveDriver.phone || '19998765432').replace(/\D/g, '')}?text=${encodeURIComponent(
                  `Olá ${effectiveDriver.name}! Sou seu passageiro do RACE. Estou te acompanhando pelo mapa ao vivo.`
                )}`}
                target="_blank"
                rel="noopener noreferrer"
                className="w-9 h-9 rounded-xl bg-emerald-50 hover:bg-emerald-100 border border-emerald-300 text-emerald-700 flex items-center justify-center transition-all shadow-xs cursor-pointer active:scale-95 shrink-0"
                title="Ligar / WhatsApp para o motorista"
              >
                <Phone className="w-4 h-4" />
              </a>

              {/* Distância e tempo grande estilo Uber */}
              <div className="text-right">
                <div className="text-xl sm:text-2xl font-heading font-black text-[#ff6a00]">
                  {isRideFinished
                    ? 'Chegou!'
                    : minutesLeft > 0
                    ? `Chega em ${minutesLeft} min`
                    : 'No local'}
                </div>
                <div className="text-[11px] font-mono text-slate-600 font-bold">
                  {isRideFinished ? 'Destino alcançado' : `${distanceKmFormatted} km de distância`}
                </div>
              </div>
            </div>
          </div>

          {/* ALERTA ESPECIAL QUANDO CHEGAR PERTO: "Motorista/Motoboy está chegando - 200m" */}
          {distanceRemainingMeters <= 200 && !hasDriverArrived && !isRideInProgress && !isRideFinished && (
            <div className="bg-amber-50 border-2 border-[#ff6a00] rounded-2xl p-3 flex items-center justify-between gap-3 animate-pulse">
              <div className="flex items-center gap-3">
                <div className="w-8 h-8 rounded-full bg-[#ff6a00] text-white flex items-center justify-center shrink-0 shadow">
                  <BellRing className="w-4 h-4 stroke-[2.5]" />
                </div>
                <div>
                  <span className="font-heading font-black text-xs sm:text-sm text-slate-950 block">
                    {isMotoboy ? 'Motoboy está chegando - 200m' : 'Motorista está chegando - 200m'}
                  </span>
                  <span className="text-[11px] text-amber-900 font-medium">
                    Dirija-se ao ponto de embarque na calçada
                  </span>
                </div>
              </div>
            </div>
          )}

          {/* QUANDO CHEGAR A 0m / NO LOCAL: "Motorista/Motoboy chegou!" + botão para ouvir áudio novamente + "Iniciar corrida" */}
          {hasDriverArrived && !isRideInProgress && !isRideFinished && (
            <div className="bg-emerald-50 border border-emerald-300 rounded-2xl p-4 text-center space-y-3">
              <div className="flex items-center justify-center gap-2 text-emerald-800 font-heading font-black text-base sm:text-lg">
                <CheckCircle2 className="w-5 h-5 text-emerald-600" />
                <span>{isMotoboy ? 'Motoboy Chegou!' : 'Motorista Chegou!'}</span>
              </div>
              <p className="text-xs text-slate-600 font-medium">
                O {isMotoboy ? 'motoboy' : 'veículo'} ({effectiveDriver.vehiclePlate}) está te aguardando no local de embarque.
              </p>
              
              <div className="flex items-center justify-center gap-2">
                <button
                  type="button"
                  onClick={handleTestAudioArrival}
                  className="py-1.5 px-3 bg-emerald-100 hover:bg-emerald-200 text-emerald-800 text-xs font-bold rounded-xl flex items-center gap-1.5 transition-all cursor-pointer"
                  title="Repetir áudio avisando chegada"
                >
                  <Volume2 className="w-3.5 h-3.5" />
                  <span>Ouvir aviso de voz</span>
                </button>
              </div>

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

          {/* QUANDO CORRIDA EM ANDAMENTO: Botão para concluir corrida e testar "Você chegou ao seu destino" */}
          {isRideInProgress && !isRideFinished && (
            <div className="bg-blue-50 border border-blue-200 rounded-2xl p-3.5 space-y-2.5">
              <div className="flex items-center justify-between">
                <span className="text-xs font-heading font-black text-blue-900 flex items-center gap-1.5">
                  <span className="w-2.5 h-2.5 rounded-full bg-blue-600 animate-pulse" />
                  Viagem em deslocamento para o destino
                </span>
              </div>
              <button
                type="button"
                onClick={() => {
                  setIsRideInProgress(false);
                  setIsRideFinished(true);
                  setDistanceRemainingMeters(0);
                  setSecondsRemaining(0);
                }}
                className="w-full py-3 bg-emerald-600 hover:bg-emerald-500 active:scale-95 text-white font-heading font-black text-xs sm:text-sm rounded-xl shadow-md transition-all cursor-pointer flex items-center justify-center gap-2"
              >
                <CheckCircle2 className="w-4 h-4" />
                <span>FINALIZAR VIAGEM (CHEGADA AO DESTINO)</span>
              </button>
            </div>
          )}

          {/* QUANDO A CORRIDA FOI CONCLUÍDA */}
          {isRideFinished && (
            <div className="bg-emerald-50 border border-emerald-300 rounded-2xl p-4 text-center space-y-2.5">
              <div className="flex items-center justify-center gap-2 text-emerald-800 font-heading font-black text-base">
                <CheckCircle2 className="w-5 h-5 text-emerald-600" />
                <span>Você chegou ao seu destino!</span>
              </div>
              <p className="text-xs text-slate-600 font-medium">
                Viagem concluída com segurança em Indaiatuba.
              </p>
            </div>
          )}

          {/* Botões de Ação na Base incluindo Botão Voltar */}
          <div className="flex items-center gap-2 pt-1">
            <button
              type="button"
              onClick={onClose}
              className="py-2.5 px-4 bg-[#ff6a00] hover:bg-[#e05e00] text-white font-heading font-black text-xs rounded-xl transition-all cursor-pointer flex items-center gap-1.5 shadow-md active:scale-95 border border-[#ff8533] uppercase tracking-wider"
              title="Voltar às Opções de Corrida"
            >
              <ArrowLeft className="w-4 h-4" />
              <span>Voltar</span>
            </button>

            {/* Botão de Som Rápido na Barra Inferior */}
            <button
              type="button"
              onClick={handleToggleAudio}
              className={`py-2.5 px-3 border font-heading font-bold text-xs rounded-xl transition-all cursor-pointer flex items-center gap-1.5 ${
                audioEnabled
                  ? 'bg-amber-50 text-amber-900 border-amber-300'
                  : 'bg-slate-100 text-slate-500 border-slate-300'
              }`}
              title="Ligar ou desligar som e voz"
            >
              {audioEnabled ? <Volume2 className="w-4 h-4 text-[#ff6a00]" /> : <VolumeX className="w-4 h-4 text-slate-400" />}
              <span className="hidden sm:inline">{audioEnabled ? 'Som Ligado' : 'Som Mudo'}</span>
            </button>

            <button
              type="button"
              onClick={handleViewFullRoute}
              className="flex-1 py-2.5 px-3 bg-slate-100 hover:bg-slate-200 text-slate-800 border border-slate-200 font-heading font-bold text-xs rounded-xl transition-all cursor-pointer flex items-center justify-center gap-1.5"
            >
              <Route className="w-4 h-4 text-[#ff6a00]" />
              <span>Ver trajeto</span>
            </button>

            <button
              type="button"
              onClick={handleCenterOnCar}
              className="py-2.5 px-3.5 bg-slate-900 hover:bg-slate-800 text-white font-heading font-bold text-xs rounded-xl transition-all cursor-pointer flex items-center gap-1.5 shadow-sm"
            >
              <Crosshair className="w-4 h-4 text-amber-400" />
              <span>Seguir Carro</span>
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};
