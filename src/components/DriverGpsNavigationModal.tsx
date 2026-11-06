import React, { useEffect, useRef, useState } from 'react';
import L from 'leaflet';
import 'leaflet/dist/leaflet.css';
import { 
  ArrowLeft, 
  CornerUpRight, 
  CornerUpLeft, 
  ArrowUp, 
  Compass, 
  Crosshair, 
  Volume2, 
  VolumeX, 
  Phone, 
  ShieldCheck, 
  CheckCircle2, 
  Navigation,
  AlertTriangle
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
import { Driver } from '../types';

interface DriverGpsNavigationModalProps {
  driver: Driver;
  onClose: () => void;
  onCompleteRide?: () => void;
}

export const DriverGpsNavigationModal: React.FC<DriverGpsNavigationModalProps> = ({
  driver,
  onClose,
  onCompleteRide,
}) => {
  const mapContainerRef = useRef<HTMLDivElement>(null);
  const mapInstanceRef = useRef<L.Map | null>(null);
  const carMarkerRef = useRef<L.Marker | null>(null);
  const routePolylineRef = useRef<L.Polyline | null>(null);
  const stepRef = useRef(0);

  const [routeData, setRouteData] = useState<StreetRouteResult>({
    coordinates: INDAIATUBA_REAL_STREET_COORDINATES,
    steps: INDAIATUBA_REAL_STEPS,
    totalDistanceMeters: 1800,
    totalDurationSeconds: 240,
  });

  const [currentStepIndex, setCurrentStepIndex] = useState(0);
  const [carHeading, setCarHeading] = useState(209);
  const [carPos, setCarPos] = useState<[number, number]>(INDAIATUBA_REAL_STREET_COORDINATES[0]);
  const [speedKmh, setSpeedKmh] = useState(42);
  const [distanceRemainingMeters, setDistanceRemainingMeters] = useState(1800);
  const [secondsRemaining, setSecondsRemaining] = useState(240);
  const [isVoiceMuted, setIsVoiceMuted] = useState(false);
  const [rideCompleted, setRideCompleted] = useState(false);

  // Busca a rota real pelas ruas via OSRM ao montar
  useEffect(() => {
    let isMounted = true;
    fetchRealStreetRoute(-23.084087, -47.212027, -23.0955, -47.2250).then((res) => {
      if (isMounted && res.coordinates.length > 0) {
        setRouteData(res);
        setDistanceRemainingMeters(res.totalDistanceMeters);
        setSecondsRemaining(res.totalDurationSeconds);
        setCarPos(res.coordinates[0]);
      }
    });
    return () => {
      isMounted = false;
    };
  }, []);

  // 1. Inicializa o mapa Leaflet estilo Waze / Uber Driver com OpenStreetMap claro
  useEffect(() => {
    if (!mapContainerRef.current) return;

    if (!mapInstanceRef.current) {
      const map = L.map(mapContainerRef.current, {
        center: INDAIATUBA_CENTER_COORDS,
        zoom: 16,
        minZoom: INDAIATUBA_MIN_ZOOM,
        maxZoom: INDAIATUBA_MAX_ZOOM,
        maxBounds: INDAIATUBA_BOUNDS,
        maxBoundsViscosity: 1.0,
        zoomControl: false,
      });

      // OpenStreetMap Oficial Claro
      L.tileLayer('https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png', {
        attribution: '&copy; OpenStreetMap',
        maxZoom: 19,
      }).addTo(map);

      mapInstanceRef.current = map;
      map.invalidateSize();
      setTimeout(() => map.invalidateSize(), 150);
      setTimeout(() => map.invalidateSize(), 350);
    }

    return () => {
      if (mapInstanceRef.current) {
        mapInstanceRef.current.remove();
        mapInstanceRef.current = null;
      }
    };
  }, []);

  // 2. Traça a rota oficial grossa laranja #ff6a00
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

    // Ponto de Embarque / Destino no mapa
    const destCoord = routeData.coordinates[routeData.coordinates.length - 1];
    const destIcon = L.divIcon({
      className: 'driver-dest-icon',
      html: `
        <div class="relative flex flex-col items-center">
          <div class="w-8 h-8 rounded-full bg-emerald-500 text-black font-black flex items-center justify-center border-2 border-white shadow-xl text-xs">
            👤
          </div>
          <div class="bg-black/90 text-white font-mono font-bold text-[10px] px-2 py-0.5 rounded border border-emerald-400 mt-1 shadow-lg">
            Embarque Passageiro
          </div>
        </div>
      `,
      iconSize: [36, 44],
      iconAnchor: [18, 22],
    });
    L.marker(destCoord, { icon: destIcon }).addTo(map);
  }, [routeData]);

  // 3. Atualiza marcador do carro com rotação real na curva
  useEffect(() => {
    const map = mapInstanceRef.current;
    if (!map) return;

    const carHtml = `
      <div class="relative flex items-center justify-center" style="transform: rotate(${carHeading}deg); transition: transform 0.4s ease-out;">
        <div class="absolute w-12 h-12 rounded-full bg-[#ff6a00]/30 animate-pulse"></div>
        <svg width="42" height="42" viewBox="0 0 48 48" fill="none" class="drop-shadow-2xl">
          <path d="M24 3 L29 13 L24 10 L19 13 Z" fill="#ffffff" />
          <rect x="15" y="8" width="18" height="34" rx="7" fill="#ff6a00" stroke="#ffffff" stroke-width="2"/>
          <rect x="18" y="16" width="12" height="6" rx="2" fill="#09090b" opacity="0.9"/>
          <rect x="18" y="30" width="12" height="4" rx="1.5" fill="#09090b" opacity="0.9"/>
          <circle cx="17" cy="9" r="1.5" fill="#fef08a"/>
          <circle cx="31" cy="9" r="1.5" fill="#fef08a"/>
          <circle cx="17" cy="41" r="1.5" fill="#ef4444"/>
          <circle cx="31" cy="41" r="1.5" fill="#ef4444"/>
        </svg>
      </div>
    `;

    const carIcon = L.divIcon({
      className: 'gps-driver-car',
      html: carHtml,
      iconSize: [44, 44],
      iconAnchor: [22, 22],
    });

    if (carMarkerRef.current) {
      carMarkerRef.current.setLatLng(carPos);
      carMarkerRef.current.setIcon(carIcon);
    } else {
      carMarkerRef.current = L.marker(carPos, { icon: carIcon }).addTo(map);
    }
  }, [carPos, carHeading]);

  // 4. Simulação de condução: o carro avança rua por rua a cada 2s e gira na esquina
  useEffect(() => {
    if (rideCompleted) return;

    const interval = setInterval(() => {
      const coords = routeData.coordinates;
      if (coords.length === 0) return;

      const prev = stepRef.current;
      const next = prev + 1;

      if (next >= coords.length) {
        setRideCompleted(true);
        setDistanceRemainingMeters(0);
        setSecondsRemaining(0);
        setSpeedKmh(0);
        clearInterval(interval);
        return;
      }

      stepRef.current = next;
      setCurrentStepIndex(next);

      const currentPoint = coords[prev];
      const nextPoint = coords[next];
      setCarPos(nextPoint);

      // Calcula o ângulo exato para a curva na esquina
      const heading = calculateBearing(currentPoint[0], currentPoint[1], nextPoint[0], nextPoint[1]);
      setCarHeading(heading);

      // Variação realista de velocidade urbana (38 a 48 km/h nas retas, reduz para 22 km/h nas curvas)
      const isCornerTurn = Math.abs(heading - carHeading) > 35;
      const targetSpeed = isCornerTurn ? 22 : Math.floor(40 + Math.random() * 8);
      setSpeedKmh(targetSpeed);

      // Atualiza métricas restantes
      const pct = (coords.length - 1 - next) / (coords.length - 1);
      setDistanceRemainingMeters(Math.max(Math.round(pct * routeData.totalDistanceMeters), 0));
      setSecondsRemaining(Math.max(Math.round(pct * routeData.totalDurationSeconds), 0));

      // Centraliza a visão do GPS suavemente no carro
      if (mapInstanceRef.current) {
        mapInstanceRef.current.setView(nextPoint, 16, { animate: true, duration: 1.2 });
      }
    }, 2000);

    return () => clearInterval(interval);
  }, [routeData, carHeading, rideCompleted]);

  // Determina a instrução de manobra atual (Waze / Uber Driver)
  const steps = routeData.steps;
  const currentManeuver = (() => {
    if (rideCompleted) {
      return {
        instruction: 'Você chegou ao ponto de embarque!',
        sub: 'Passageiro aguardando no local',
        modifier: 'arrive',
      };
    }
    if (distanceRemainingMeters <= 200) {
      return {
        instruction: 'Embarque em 200m à sua direita',
        sub: 'Parque Ecológico de Indaiatuba',
        modifier: 'right',
      };
    }
    const stepIdx = Math.min(Math.floor((currentStepIndex / routeData.coordinates.length) * steps.length), steps.length - 1);
    const active = steps[stepIdx] || steps[0];
    return {
      instruction: active.instruction,
      sub: `Siga pela ${active.streetName}`,
      modifier: active.modifier || 'straight',
    };
  })();

  const minutesLeft = Math.ceil(secondsRemaining / 60);

  return (
    <div className="fixed inset-0 z-50 bg-[#09090b] text-white flex flex-col w-screen h-screen overflow-hidden select-none">
      {/* BARRA SUPERIOR VERDE DE NAVEGAÇÃO WAZE / UBER DRIVER */}
      <div className="absolute top-0 left-0 right-0 z-[1000] p-3 sm:p-4 bg-gradient-to-b from-black/90 via-black/70 to-transparent pointer-events-none">
        <div className="max-w-2xl mx-auto flex items-start justify-between gap-3 pointer-events-auto">
          {/* Caixa Verde de Manobra estilo Waze */}
          <div className="flex-1 bg-[#10b981] text-slate-950 rounded-3xl p-3.5 sm:p-4 shadow-2xl flex items-center gap-3.5 border-2 border-emerald-300 animate-fade-in">
            <div className="w-12 h-12 rounded-2xl bg-slate-950 text-white flex items-center justify-center font-black shrink-0 shadow-md">
              {currentManeuver.modifier === 'right' ? (
                <CornerUpRight className="w-7 h-7 text-emerald-400 stroke-[3]" />
              ) : currentManeuver.modifier === 'left' ? (
                <CornerUpLeft className="w-7 h-7 text-emerald-400 stroke-[3]" />
              ) : (
                <ArrowUp className="w-7 h-7 text-emerald-400 stroke-[3]" />
              )}
            </div>
            <div>
              <span className="text-[11px] font-mono font-black text-emerald-950 uppercase tracking-wider block">
                {distanceRemainingMeters <= 200 ? 'CHEGANDO NO DESTINO' : 'PRÓXIMA MANOBRA'}
              </span>
              <h2 className="font-heading font-black text-base sm:text-lg text-slate-950 leading-tight">
                {currentManeuver.instruction}
              </h2>
              <p className="text-xs text-emerald-950 font-bold opacity-80 mt-0.5">
                {currentManeuver.sub}
              </p>
            </div>
          </div>

          {/* Velocímetro estilo Waze */}
          <div className="flex flex-col items-center gap-1.5 shrink-0">
            <div className="w-14 h-14 rounded-full bg-black/90 border-4 border-emerald-500 shadow-2xl flex flex-col items-center justify-center">
              <span className="font-heading font-black text-white text-base leading-none">
                {speedKmh}
              </span>
              <span className="text-[8px] font-mono text-zinc-400 uppercase">km/h</span>
            </div>
            <div className="w-7 h-7 rounded-full bg-white border-2 border-rose-600 flex items-center justify-center text-[10px] font-black text-slate-900 shadow">
              50
            </div>
          </div>
        </div>
      </div>

      {/* BOTÕES LATERAIS DE CONTROLE RÁPIDO */}
      <div className="absolute top-28 right-4 z-[1000] flex flex-col gap-2.5">
        <button
          type="button"
          onClick={() => setIsVoiceMuted(!isVoiceMuted)}
          className="w-11 h-11 bg-black/90 hover:bg-zinc-800 border border-zinc-800 text-white rounded-2xl shadow-xl flex items-center justify-center cursor-pointer active:scale-95 transition-all"
          title="Áudio de Orientação"
        >
          {isVoiceMuted ? <VolumeX className="w-5 h-5 text-rose-400" /> : <Volume2 className="w-5 h-5 text-emerald-400" />}
        </button>

        <button
          type="button"
          onClick={() => {
            if (mapInstanceRef.current) {
              mapInstanceRef.current.setView(carPos, 16, { animate: true });
            }
          }}
          className="w-11 h-11 bg-black/90 hover:bg-[#ff6a00] border border-zinc-800 text-[#ff6a00] hover:text-white rounded-2xl shadow-xl flex items-center justify-center cursor-pointer active:scale-95 transition-all"
          title="Centralizar no Carro"
        >
          <Crosshair className="w-5 h-5" />
        </button>

        <button
          type="button"
          onClick={onClose}
          className="w-11 h-11 bg-rose-600 hover:bg-rose-500 text-white rounded-2xl shadow-xl flex items-center justify-center cursor-pointer active:scale-95 transition-all"
          title="Fechar Navegação GPS"
        >
          <ArrowLeft className="w-5 h-5" />
        </button>
      </div>

      {/* CANVAS DO MAPA FULLSCREEN CLARO */}
      <div 
        ref={mapContainerRef} 
        className="w-full h-full flex-1 z-0 bg-white" 
        style={{ width: '100vw', height: '100vh', background: '#ffffff' }}
      />

      {/* BARRA INFERIOR UBER DRIVER DE TELEMETRIA */}
      <div className="absolute bottom-4 sm:bottom-6 left-3 right-3 sm:left-6 sm:right-6 max-w-xl mx-auto z-[1000]">
        <div className="bg-zinc-950/95 backdrop-blur-2xl border-2 border-zinc-800 text-white rounded-3xl p-4 sm:p-5 shadow-[0_12px_40px_rgba(0,0,0,0.85)] space-y-3">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-3">
              <span className="w-3 h-3 rounded-full bg-emerald-500 radar-pulse" />
              <div>
                <span className="font-heading font-black text-white text-base sm:text-lg">
                  {minutesLeft} min &bull; {(distanceRemainingMeters / 1000).toFixed(1)} km
                </span>
                <p className="text-xs text-zinc-400 font-medium">
                  RACE Driver GPS &bull; Indaiatuba - SP
                </p>
              </div>
            </div>

            <div className="text-right">
              <span className="text-xs font-mono font-bold text-emerald-400 bg-emerald-950/80 px-2.5 py-1 rounded-full border border-emerald-500/40">
                100% Livre de Taxa
              </span>
            </div>
          </div>

          {rideCompleted ? (
            <div className="bg-emerald-950/70 border border-emerald-400 rounded-2xl p-3 text-center space-y-2">
              <div className="flex items-center justify-center gap-2 text-emerald-300 font-heading font-black text-sm sm:text-base">
                <CheckCircle2 className="w-5 h-5" />
                <span>Chegada no Local de Embarque Concluída!</span>
              </div>
              <button
                type="button"
                onClick={() => {
                  if (onCompleteRide) onCompleteRide();
                  onClose();
                }}
                className="w-full py-3 bg-emerald-500 hover:bg-emerald-400 text-slate-950 font-heading font-black text-sm rounded-xl cursor-pointer transition-all shadow-lg active:scale-95"
              >
                PASSAGEIRO EMBARCOU (INICIAR DESTINO)
              </button>
            </div>
          ) : (
            <div className="flex items-center gap-2 pt-1">
              <button
                type="button"
                onClick={onClose}
                className="flex-1 py-3 bg-zinc-900 hover:bg-zinc-800 text-zinc-300 hover:text-white font-heading font-bold text-xs sm:text-sm rounded-xl border border-zinc-700 transition-all cursor-pointer"
              >
                Voltar ao Painel
              </button>
              <button
                type="button"
                onClick={() => {
                  setRideCompleted(true);
                  setDistanceRemainingMeters(0);
                }}
                className="flex-1 py-3 bg-[#ff6a00] hover:bg-[#e05e00] text-white font-heading font-black text-xs sm:text-sm rounded-xl transition-all cursor-pointer shadow-lg active:scale-95 border border-[#ff8533]"
              >
                CHEGUEI NO LOCAL
              </button>
            </div>
          )}
        </div>
      </div>
    </div>
  );
};
