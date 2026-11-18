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
  Car,
  BellRing,
  Navigation,
  Volume2,
  VolumeX,
  Check,
  Phone,
  Loader2,
  User,
  XCircle,
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
  cancelVoiceSpeech
} from '../services/audioNotificationService';
import { generateUniqueRideConfirmationCode } from '../services/pricingService';
import { fetchUsuarioPhotoByIdentity, hydrateRidesWithUserPhotosSupabase } from '../supabase';
import { ShieldCheck } from 'lucide-react';

interface FullMapViewProps {
  onClose: () => void;
  pickup: LocationPoint | null;
  destination: LocationPoint | null;
  activeDriver: Driver | null;
  activeRide: Ride | null;
  onlineDrivers?: Driver[];
  driverPosition?: { lat: number; lng: number };
  onUpdateDriverPosition?: (pos: { lat: number; lng: number }) => void;
  onCompleteRide?: () => void;
  onCancelRide?: () => void;
  currentUserAvatar?: string;
  currentUserName?: string;
}

export const FullMapView: React.FC<FullMapViewProps> = ({
  onClose,
  pickup,
  destination,
  activeDriver,
  activeRide,
  onlineDrivers = [],
  driverPosition,
  onUpdateDriverPosition,
  onCompleteRide,
  onCancelRide,
  currentUserAvatar,
  currentUserName,
}) => {
  const mapContainerRef = useRef<HTMLDivElement>(null);
  const mapInstanceRef = useRef<L.Map | null>(null);
  const driverMarkerRef = useRef<L.Marker | null>(null);
  const onlineMarkersRef = useRef<{ [key: string]: L.Marker }>({});
  const pickupMarkerRef = useRef<L.Marker | null>(null);
  const destMarkerRef = useRef<L.Marker | null>(null);
  const routePolylineRef = useRef<L.Polyline | null>(null);
  const fullPolylineRef = useRef<L.Polyline | null>(null);

  const rideStatus = activeRide?.status || 'procurando';
  const isAccepted =
    rideStatus === 'accepted' ||
    (rideStatus as string) === 'aceita' ||
    (rideStatus as string) === 'em_andamento' ||
    rideStatus === 'driver_assigned' ||
    rideStatus === 'driver_arriving' ||
    rideStatus === 'in_progress' ||
    rideStatus === 'completed' ||
    rideStatus === 'finalizada';
  const isSearching = !isAccepted;

  const stepRef = useRef(0);
  const hasInitialFitBoundsRef = useRef(false);
  const [fallbackConfirmationCode] = useState<string>(() => generateUniqueRideConfirmationCode());
  const displayConfirmationCode = activeRide?.confirmationCode || fallbackConfirmationCode;
  const [copiedRideCode, setCopiedRideCode] = useState(false);

  const handleCopyConfirmationCode = () => {
    navigator.clipboard?.writeText(displayConfirmationCode);
    setCopiedRideCode(true);
    setTimeout(() => setCopiedRideCode(false), 2500);
  };

  // Coordenadas padrão em Indaiatuba - SP
  const pLat = pickup?.lat ?? activeRide?.pickup?.lat ?? -23.0955;
  const pLng = pickup?.lng ?? activeRide?.pickup?.lng ?? -47.2250;
  const startCarLat = activeRide?.driver?.lat || activeDriver?.lat || -23.084087;
  const startCarLng = activeRide?.driver?.lng || activeDriver?.lng || -47.212027;

  // Driver details
  const effectiveDriver: Driver = activeRide?.driver || activeDriver || {
    id: '',
    name: 'Condutor RACE',
    avatar: '',
    phone: '',
    email: '',
    cpf: '',
    cnh: '',
    category: 'economica',
    vehicleModel: '',
    vehiclePlate: '',
    vehicleColor: '',
    vehicleYear: 2023,
    rating: 0,
    totalRides: 0,
    status: 'online',
    lat: startCarLat,
    lng: startCarLng,
    weeklyPlanActive: true,
    earningsToday: 0,
    earningsWeek: 0,
    cnhVerified: true,
    vehicleVerified: true,
    criminalRecordClear: true,
    registrationDate: '',
  };

  const [hydratedDriverAvatar, setHydratedDriverAvatar] = useState<string>(
    effectiveDriver.avatar || ''
  );

  useEffect(() => {
    const knownDriverPhoto = effectiveDriver.avatar || activeDriver?.avatar || '';
    if (knownDriverPhoto) setHydratedDriverAvatar(knownDriverPhoto);
    if (knownDriverPhoto) return;

    let cancelled = false;
    const loadMissingDriverPhoto = async () => {
      if (activeRide) {
        try {
          const [hydrated] = await hydrateRidesWithUserPhotosSupabase([activeRide]);
          if (!cancelled && hydrated?.driver?.avatar) {
            setHydratedDriverAvatar(hydrated.driver.avatar);
          }
        } catch {}
      }

      if (effectiveDriver.name && effectiveDriver.name !== 'Condutor RACE') {
        try {
          const photo = await fetchUsuarioPhotoByIdentity({
            id: effectiveDriver.id,
            email: effectiveDriver.email,
            phone: effectiveDriver.phone,
            name: effectiveDriver.name,
          });
          if (!cancelled && photo?.avatar) setHydratedDriverAvatar(photo.avatar);
        } catch {}
      }
    };

    loadMissingDriverPhoto();
    return () => {
      cancelled = true;
    };
  }, [
    activeRide?.id,
    activeRide?.status,
    effectiveDriver.id,
    effectiveDriver.email,
    effectiveDriver.phone,
    effectiveDriver.name,
    effectiveDriver.avatar,
    activeDriver?.avatar,
  ]);

  const displayDriverAvatar = effectiveDriver.avatar || hydratedDriverAvatar;

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
  const [isRideInProgress, setIsRideInProgress] = useState(true);
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

  // 1. Áudio: SOMENTE depois que motorista/motoboy aceitar de verdade (status = aceita/accepted/em_andamento)
  useEffect(() => {
    if (isAccepted && !hasAnnouncedAcceptedRef.current) {
      hasAnnouncedAcceptedRef.current = true;
      hasInitialFitBoundsRef.current = false;
      stepRef.current = 0;
      notifyDriverAccepted(isMotoboy, effectiveDriver.name);
    }
  }, [isAccepted, isMotoboy, effectiveDriver.name]);

  // 2. Áudio Automático: Quando chegar no ponto de embarque (somente se já aceito)
  useEffect(() => {
    if (isAccepted && (distanceRemainingMeters <= 100 || hasDriverArrived) && !hasAnnouncedArrivedRef.current) {
      hasAnnouncedArrivedRef.current = true;
      notifyDriverArrived(isMotoboy);
    }
  }, [isAccepted, distanceRemainingMeters, hasDriverArrived, isMotoboy]);

  // 3. Áudio: Quando a corrida terminar
  useEffect(() => {
    if (isAccepted && isRideFinished && !hasAnnouncedFinishedRef.current) {
      hasAnnouncedFinishedRef.current = true;
      notifyRideFinished();
    }
  }, [isAccepted, isRideFinished]);

  // 1. Busca rota real pelas ruas via OSRM SOMENTE depois que motorista aceitar
  useEffect(() => {
    if (!isAccepted) return;
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
  }, [isAccepted, startCarLat, startCarLng, pLat, pLng]);

  // 2. Inicializa Leaflet com movimento 100% livre (dragging, touchZoom, scrollWheelZoom, doubleClickZoom, zoomControl)
  useEffect(() => {
    if (!mapContainerRef.current) return;

    if (!mapInstanceRef.current) {
      const map = L.map(mapContainerRef.current, {
        center: [-23.0903, -47.2180],
        zoom: 15,
        minZoom: INDAIATUBA_MIN_ZOOM,
        maxZoom: INDAIATUBA_MAX_ZOOM,
        maxBounds: INDAIATUBA_BOUNDS,
        maxBoundsViscosity: 0.5,
        dragging: true,
        scrollWheelZoom: true,
        touchZoom: true,
        doubleClickZoom: true,
        boxZoom: true,
        zoomControl: true,
      });

      // OpenStreetMap Oficial Claro - Ruas de Indaiatuba com nomes bem nítidos
      L.tileLayer('https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png', {
        attribution: '&copy; OpenStreetMap',
        maxZoom: 19,
      }).addTo(map);

      map.zoomControl?.setPosition('topright');

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

  // 3. Rota Laranja #ff6a00 somente DEPOIS que motorista aceitar (NÃO mostrar rota durante MODO PROCURANDO)
  useEffect(() => {
    const map = mapInstanceRef.current;
    if (!map) return;

    if (!isAccepted) {
      if (routePolylineRef.current) {
        routePolylineRef.current.remove();
        routePolylineRef.current = null;
      }
      if (fullPolylineRef.current) {
        fullPolylineRef.current.remove();
        fullPolylineRef.current = null;
      }
      if (!hasInitialFitBoundsRef.current) {
        hasInitialFitBoundsRef.current = true;
        const activeOnline = onlineDrivers.filter((d) => d.status === 'online');
        if (activeOnline.length > 0) {
          const searchPoints: [number, number][] = [[pLat, pLng]];
          activeOnline.forEach((d) => {
            if (typeof d.lat === 'number' && typeof d.lng === 'number' && d.lat !== 0 && d.lng !== 0) {
              searchPoints.push([d.lat, d.lng]);
            }
          });
          if (searchPoints.length > 1) {
            const bounds = L.latLngBounds(searchPoints);
            map.fitBounds(bounds, {
              paddingTopLeft: [45, 90],
              paddingBottomRight: [45, 220],
              maxZoom: 15,
              animate: true,
            });
          } else {
            map.setView([pLat, pLng], 15, { animate: true });
          }
        } else {
          map.setView([pLat, pLng], 15, { animate: true });
        }
      }
      return;
    }

    if (routeData.coordinates.length === 0) return;

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

    // Mostra o percurso inteiro [origem, destino] 1 vez só após aceite; depois o usuário movimenta livremente
    if (!hasInitialFitBoundsRef.current) {
      hasInitialFitBoundsRef.current = true;
      const boundsPoints: [number, number][] = [
        ...routeData.coordinates,
        [pLat, pLng],
      ];
      if (destination?.lat && destination?.lng) {
        boundsPoints.push([destination.lat, destination.lng]);
      }
      const bounds = L.latLngBounds(boundsPoints);
      map.fitBounds(bounds, {
        paddingTopLeft: [45, 90],
        paddingBottomRight: [45, 190],
        animate: true,
      });
    }
  }, [isAccepted, routeData, pLat, pLng, destination, onlineDrivers]);

  // 4. Marcador de Embarque (Pino de Localização estilo GPS, sem bolinhas)
  useEffect(() => {
    const map = mapInstanceRef.current;
    if (!map) return;

    const passengerHtml = `
      <div style="filter: drop-shadow(0 4px 6px rgba(0,0,0,0.35)); display: flex; flex-direction: column; align-items: center;">
        <svg width="32" height="40" viewBox="0 0 32 40" fill="none">
          <path d="M16 0C7.16 0 0 7.16 0 16C0 28 16 40 16 40C16 40 32 28 32 16C32 7.16 24.84 0 16 0Z" fill="#2563eb" stroke="#ffffff" stroke-width="2.5"/>
          <path d="M16 8C13.8 8 12 9.8 12 12C12 14.2 13.8 16 16 16C18.2 16 20 14.2 20 12C20 9.8 18.2 8 16 8ZM16 18C13 18 10 19.5 10 22.5V24H22V22.5C22 19.5 19 18 16 18Z" fill="#ffffff" />
        </svg>
        <div style="background: #0f172a; color: #ffffff; font-family: sans-serif; font-size: 10px; font-weight: 800; padding: 2px 7px; border-radius: 9999px; border: 1.5px solid #ffffff; margin-top: -3px; box-shadow: 0 4px 6px rgba(0,0,0,0.3); white-space: nowrap;">
          Passageiro (Embarque)
        </div>
      </div>
    `;

    const passengerIcon = L.divIcon({
      className: 'passenger-pin-marker',
      html: passengerHtml,
      iconSize: [36, 44],
      iconAnchor: [18, 38],
    });

    if (pickupMarkerRef.current) {
      pickupMarkerRef.current.setLatLng([pLat, pLng]);
    } else {
      pickupMarkerRef.current = L.marker([pLat, pLng], { icon: passengerIcon }).addTo(map);
    }

    // Marcador de Destino (se informado)
    if (destination?.lat && destination?.lng) {
      const destHtml = `
        <div style="filter: drop-shadow(0 4px 6px rgba(0,0,0,0.35)); display: flex; flex-direction: column; align-items: center;">
          <div style="background: #ff6a00; color: #ffffff; font-family: sans-serif; font-size: 10px; font-weight: 800; padding: 3px 8px; border-radius: 9999px; border: 2px solid #ffffff; box-shadow: 0 4px 6px rgba(0,0,0,0.3); white-space: nowrap;">
            🏁 Destino
          </div>
        </div>
      `;
      const destIcon = L.divIcon({
        className: 'dest-pin-marker',
        html: destHtml,
        iconSize: [70, 26],
        iconAnchor: [35, 13],
      });
      if (destMarkerRef.current) {
        destMarkerRef.current.setLatLng([destination.lat, destination.lng]);
      } else {
        destMarkerRef.current = L.marker([destination.lat, destination.lng], { icon: destIcon }).addTo(map);
      }
    }
  }, [pLat, pLng, destination]);

  // 5A. MODO PROCURANDO: Mostrar TODOS os motoristas online PARADOS, sem movimento e sem carro andando sozinho
  useEffect(() => {
    const map = mapInstanceRef.current;
    if (!map) return;

    if (!isSearching) {
      // Ao aceitar, esconder todos os outros motoristas do mapa
      Object.keys(onlineMarkersRef.current).forEach((key) => {
        onlineMarkersRef.current[key].remove();
        delete onlineMarkersRef.current[key];
      });
      return;
    }

    const activeOnline = onlineDrivers.filter((d) => d.status === 'online');
    const keepKeys = new Set<string>();
    const placedPositions: [number, number][] = [];

    activeOnline.forEach((drv, idx) => {
      const key = drv.id || drv.email || `online-${idx}`;
      keepKeys.add(key);

      const isMoto = drv.category.includes('moto');
      let lat = typeof drv.lat === 'number' && drv.lat !== 0 ? drv.lat : -23.0842;
      let lng = typeof drv.lng === 'number' && drv.lng !== 0 ? drv.lng : -47.2118;

      // Só aplica micro-separação visual se outro motorista online estiver exatamente na mesma coordenada GPS
      const collisionCount = placedPositions.filter(
        ([pLat0, pLng0]) => Math.abs(pLat0 - lat) < 0.00005 && Math.abs(pLng0 - lng) < 0.00005
      ).length;
      if (collisionCount > 0) {
        lat += ((collisionCount % 3) - 1) * 0.00045;
        lng += (Math.floor(collisionCount / 3) + 1) * 0.00045;
      }
      placedPositions.push([lat, lng]);
      const pos: [number, number] = [lat, lng];

      const staticHtml = isMoto
        ? `
        <div style="display: flex; flex-direction: column; align-items: center;">
          <div style="width: 44px; height: 44px; display: flex; align-items: center; justify-content: center; filter: drop-shadow(0 4px 6px rgba(0,0,0,0.4));">
            <svg width="44" height="44" viewBox="0 0 48 48" fill="none">
              <rect x="22" y="3" width="4" height="9" rx="2" fill="#18181b" stroke="#ffffff" stroke-width="0.8" />
              <line x1="12" y1="12" x2="36" y2="12" stroke="#ffffff" stroke-width="2.5" stroke-linecap="round" />
              <path d="M21 14C21 13 22 12.5 24 12.5C26 12.5 27 13 27 14L28 20C28 21 26.5 22 24 22C21.5 22 20 21 20 20L21 14Z" fill="#ff6a00" stroke="#ffffff" stroke-width="1" />
              <circle cx="24" cy="25" r="5" fill="#18181b" stroke="#ffffff" stroke-width="1.2" />
              <rect x="21" y="29" width="6" height="8" rx="3" fill="#27272a" />
            </svg>
          </div>
          <div style="background: #09090b; color: #ff6a00; font-family: monospace; font-size: 9px; font-weight: 900; padding: 1px 6px; border-radius: 9999px; border: 1.5px solid #ffffff; white-space: nowrap;">
            ${drv.vehiclePlate || 'ONLINE'}
          </div>
        </div>`
        : `
        <div style="display: flex; flex-direction: column; align-items: center;">
          <div style="width: 44px; height: 44px; display: flex; align-items: center; justify-content: center; filter: drop-shadow(0 4px 6px rgba(0,0,0,0.4));">
            <svg width="44" height="44" viewBox="0 0 48 48" fill="none">
              <rect x="7" y="10" width="4" height="8" rx="2" fill="#18181b" />
              <rect x="37" y="10" width="4" height="8" rx="2" fill="#18181b" />
              <rect x="7" y="30" width="4" height="8" rx="2" fill="#18181b" />
              <rect x="37" y="30" width="4" height="8" rx="2" fill="#18181b" />
              <path d="M14 12C14 7 17 4 24 4C31 4 34 7 34 12V36C34 41 31 44 24 44C17 44 14 41 14 36V12Z" fill="#ff6a00" stroke="#ffffff" stroke-width="1.8" />
              <path d="M16 14C17 12 20 11 24 11C28 11 31 12 32 14L31 18H17L16 14Z" fill="#09090b" />
              <path d="M17 32H31L32 35C31 36.5 28 37 24 37C20 37 17 36.5 16 35L17 32Z" fill="#09090b" />
            </svg>
          </div>
          <div style="background: #09090b; color: #ff6a00; font-family: monospace; font-size: 9px; font-weight: 900; padding: 1px 6px; border-radius: 9999px; border: 1.5px solid #ffffff; white-space: nowrap;">
            ${drv.vehiclePlate || 'ONLINE'}
          </div>
        </div>`;

      const icon = L.divIcon({
        className: 'online-stationary-driver',
        html: staticHtml,
        iconSize: [44, 56],
        iconAnchor: [22, 22],
      });

      if (onlineMarkersRef.current[key]) {
        onlineMarkersRef.current[key].setLatLng(pos);
        onlineMarkersRef.current[key].setIcon(icon);
      } else {
        onlineMarkersRef.current[key] = L.marker(pos, { icon }).addTo(map);
      }
    });

    Object.keys(onlineMarkersRef.current).forEach((key) => {
      if (!keepKeys.has(key)) {
        onlineMarkersRef.current[key].remove();
        delete onlineMarkersRef.current[key];
      }
    });
  }, [isSearching, onlineDrivers]);

  // 5B. MODO A CAMINHO: Mostrar SÓ o carro do motorista que aceitou (oculto enquanto está procurando)
  useEffect(() => {
    const map = mapInstanceRef.current;
    if (!map) return;

    if (!isAccepted) {
      if (driverMarkerRef.current) {
        driverMarkerRef.current.remove();
        driverMarkerRef.current = null;
      }
      return;
    }

    const vehicleHtml = isMotoboy
      ? `
      <div style="display: flex; flex-direction: column; align-items: center;">
        <!-- Moto Real Vista de Cima (Top-Down) -->
        <div style="width: 48px; height: 48px; display: flex; align-items: center; justify-content: center; transform: rotate(${carHeading}deg); transition: transform 0.45s cubic-bezier(0.4, 0, 0.2, 1); filter: drop-shadow(0 6px 8px rgba(0,0,0,0.45));">
          <svg width="48" height="48" viewBox="0 0 48 48" fill="none" xmlns="http://www.w3.org/2000/svg">
            <rect x="22" y="3" width="4" height="9" rx="2" fill="#18181b" stroke="#ffffff" stroke-width="0.8" />
            <line x1="12" y1="12" x2="36" y2="12" stroke="#ffffff" stroke-width="2.5" stroke-linecap="round" />
            <rect x="10" y="10.5" width="4" height="3" rx="1.5" fill="#ff6a00" />
            <rect x="34" y="10.5" width="4" height="3" rx="1.5" fill="#ff6a00" />
            <circle cx="11" cy="8" r="1.5" fill="#ffffff" />
            <circle cx="37" cy="8" r="1.5" fill="#ffffff" />
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
        <!-- Placa do Veículo -->
        <div style="background: #09090b; color: #ff6a00; font-family: monospace; font-size: 10px; font-weight: 900; padding: 2px 7px; border-radius: 9999px; border: 1.5px solid #ffffff; margin-top: 2px; box-shadow: 0 4px 6px rgba(0,0,0,0.3); white-space: nowrap;">
          ${effectiveDriver.vehiclePlate} • ${speedKmh} km/h
        </div>
      </div>
      `
      : `
      <div style="display: flex; flex-direction: column; align-items: center;">
        <!-- Carro Real Laranja #ff6a00 Visto de Cima (Top-Down) -->
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
        <!-- Placa do Veículo -->
        <div style="background: #09090b; color: #ff6a00; font-family: monospace; font-size: 10px; font-weight: 900; padding: 2px 7px; border-radius: 9999px; border: 1.5px solid #ffffff; margin-top: 2px; box-shadow: 0 4px 6px rgba(0,0,0,0.3); white-space: nowrap;">
          ${effectiveDriver.vehiclePlate} • ${speedKmh} km/h
        </div>
      </div>
      `;

    const carIcon = L.divIcon({
      className: 'driver-real-car-icon',
      html: vehicleHtml,
      iconSize: [48, 62],
      iconAnchor: [24, 24],
    });

    if (driverMarkerRef.current) {
      driverMarkerRef.current.setLatLng(carPos);
      driverMarkerRef.current.setIcon(carIcon);
    } else {
      driverMarkerRef.current = L.marker(carPos, { icon: carIcon }).addTo(map);
    }
  }, [isAccepted, carPos, carHeading, speedKmh, effectiveDriver.vehiclePlate, isMotoboy]);

  // 6. Atualização segura de posição para o componente pai (App) somente após aceite
  useEffect(() => {
    if (isAccepted && onUpdateDriverPosition) {
      onUpdateDriverPosition({ lat: carPos[0], lng: carPos[1] });
    }
  }, [isAccepted, carPos, onUpdateDriverPosition]);

  // 7. Timer em tempo real a cada 1 segundo (SOMENTE após aceite)
  useEffect(() => {
    if (!isAccepted || hasDriverArrived || isRideFinished) return;

    const secInterval = setInterval(() => {
      setSecondsRemaining((prevSec) => {
        if (prevSec <= 1) return 0;
        return prevSec - 1;
      });
    }, 1000);

    return () => clearInterval(secInterval);
  }, [isAccepted, hasDriverArrived, isRideFinished]);

  // 8. Simulação do Carro em Movimento Suave pelas Ruas (SOMENTE depois que o motorista aceitar!)
  useEffect(() => {
    if (!isAccepted || hasDriverArrived || isRideFinished) return;

    const coords = routeData.coordinates;
    if (coords.length < 2) return;

    const moveInterval = setInterval(() => {
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

      // Calcula o ângulo exato para girar o carro na esquina
      const heading = calculateBearing(pCurrent[0], pCurrent[1], pNext[0], pNext[1]);
      setCarHeading(heading);

      // Velocidade realista (reduz nas curvas, acelera nas retas)
      const angleDiff = Math.abs(heading - carHeading);
      const isCurve = angleDiff > 25;
      const dynamicSpeed = isCurve ? 22 : Math.floor(40 + Math.random() * 8);
      setSpeedKmh(dynamicSpeed);

      // Distância proporcional
      const remainingPct = (coords.length - 1 - next) / (coords.length - 1);
      const distLeft = Math.round(remainingPct * routeData.totalDistanceMeters);
      setDistanceRemainingMeters(distLeft);
    }, 1000);

    return () => clearInterval(moveInterval);
  }, [isAccepted, routeData, carHeading, hasDriverArrived, isRideFinished]);

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

  // Ver corrida completa (origem + destino)
  const handleViewFullRoute = () => {
    if (!mapInstanceRef.current) return;
    const points: [number, number][] = [...routeData.coordinates, [pLat, pLng]];
    if (destination?.lat && destination?.lng) {
      points.push([destination.lat, destination.lng]);
    }
    const bounds = L.latLngBounds(points);
    mapInstanceRef.current.fitBounds(bounds, {
      paddingTopLeft: [45, 90],
      paddingBottomRight: [45, 190],
      animate: true,
    });

    if (!fullPolylineRef.current) {
      fullPolylineRef.current = L.polyline(routeData.coordinates, {
        color: '#ff6a00',
        weight: 6,
        dashArray: '8, 8',
        opacity: 0.85,
      }).addTo(mapInstanceRef.current);
    }
  };

  // Centralizar no motorista (somente ao clicar no botão)
  const handleCenterOnCar = () => {
    if (!mapInstanceRef.current) return;
    mapInstanceRef.current.setView(carPos, 16, { animate: true });
  };

  return (
    <div
      className="fixed inset-0 z-[200] bg-white text-slate-900 flex flex-col w-screen h-screen overflow-hidden select-none touch-none overscroll-none"
      style={{ touchAction: 'none' }}
    >
      {/* 1. HUD SUPERIOR: JANELINHA FINA LARGURA TOTAL ENQUANTO PROCURA vs MANOBRA GPS QUANDO ACEITO */}
      <div className="absolute top-2.5 left-2.5 right-2.5 z-[900] pointer-events-none">
        {isSearching ? (
          <div className="pointer-events-auto w-full bg-white/95 backdrop-blur-md border-2 border-[#ff6a00] text-slate-900 rounded-2xl px-2.5 py-1.5 shadow-lg flex items-center gap-2.5">
            <button
              type="button"
              onClick={() => {
                cancelVoiceSpeech();
                onClose();
              }}
              className="bg-[#ff6a00] hover:bg-[#e05e00] active:scale-95 text-white font-heading font-black text-[11px] sm:text-xs py-1.5 px-2.5 rounded-xl shadow flex items-center gap-1 transition-all cursor-pointer shrink-0 border border-[#ff8533]"
            >
              <ArrowLeft className="w-3.5 h-3.5 stroke-[3]" />
              <span>VOLTAR</span>
            </button>

            <div className="flex items-center gap-1.5 min-w-0 flex-1">
              <Loader2 className="w-4 h-4 text-[#ff6a00] animate-spin stroke-[2.75] shrink-0" />
              <span className="font-heading font-black text-[11px] sm:text-sm text-slate-950 leading-tight">
                🔍 Procurando motorista... {onlineDrivers.filter((d) => d.status === 'online').length} motorista(s) online
              </span>
            </div>

            <span className="w-2 h-2 rounded-full bg-[#ff6a00] animate-ping shrink-0 mr-0.5" />
          </div>
        ) : (
          <div className="flex items-center justify-between gap-2 w-full">
            <button
              type="button"
              onClick={() => {
                onClose();
              }}
              className="pointer-events-auto bg-[#ff6a00] hover:bg-[#e05e00] active:scale-95 text-white font-heading font-black text-xs py-2 px-3 rounded-xl shadow-lg flex items-center gap-1 transition-all cursor-pointer shrink-0 border border-[#ff8533]"
            >
              <ArrowLeft className="w-4 h-4 stroke-[3]" />
              <span>VOLTAR</span>
            </button>

            <div className="pointer-events-none flex-1 bg-white/95 backdrop-blur-md border border-slate-200 text-slate-900 rounded-xl px-3 py-1.5 shadow-md flex items-center gap-2 min-w-0">
              <div className="w-7 h-7 rounded-lg bg-[#ff6a00] text-white flex items-center justify-center shrink-0">
                {currentStep.modifier === 'right' ? (
                  <CornerUpRight className="w-4 h-4 stroke-[3]" />
                ) : currentStep.modifier === 'left' ? (
                  <CornerUpLeft className="w-4 h-4 stroke-[3]" />
                ) : (
                  <ArrowUp className="w-4 h-4 stroke-[3]" />
                )}
              </div>
              <div className="overflow-hidden min-w-0 flex-1">
                <h3 className="font-heading font-black text-xs text-slate-900 truncate">
                  {currentStep.instruction}
                </h3>
                <p className="text-[10px] text-slate-500 font-medium truncate">
                  {currentStep.street}
                </p>
              </div>
            </div>
          </div>
        )}
      </div>

      {/* TOAST DE FEEDBACK DE ÁUDIO */}
      {audioToast && (
        <div className="pointer-events-none absolute top-16 left-1/2 -translate-x-1/2 z-[910] bg-slate-950/90 backdrop-blur-md text-white font-heading font-black text-xs sm:text-sm px-4 py-2 rounded-full shadow-2xl border border-[#ff6a00] flex items-center gap-2 animate-bounce">
          <span>{audioToast}</span>
        </div>
      )}

      {/* BOTÕES RÁPIDOS LATERAIS (abaixo do zoomControl top-14) */}
      <div className="absolute top-36 right-2.5 z-[900] flex flex-col gap-2 pointer-events-none">
        <button
          type="button"
          onClick={handleToggleAudio}
          className={`pointer-events-auto w-9 h-9 border active:scale-95 rounded-xl shadow-lg flex items-center justify-center transition-all cursor-pointer ${
            audioEnabled
              ? 'bg-[#ff6a00] text-white border-[#ff8533] hover:bg-[#e05e00]'
              : 'bg-white text-slate-400 border-slate-300 hover:text-slate-600 hover:bg-slate-50'
          }`}
          title={audioEnabled ? 'Áudio ATIVADO (clique para mutar)' : 'Áudio MUTADO (clique para ativar som)'}
        >
          {audioEnabled ? <Volume2 className="w-4 h-4 stroke-[2.5]" /> : <VolumeX className="w-4 h-4 stroke-[2.5]" />}
        </button>

        {isAccepted && (
          <>
            <button
              type="button"
              onClick={handleCenterOnCar}
              className="pointer-events-auto w-9 h-9 bg-white hover:bg-slate-50 border border-slate-300 active:scale-95 text-[#ff6a00] rounded-xl shadow-lg flex items-center justify-center transition-all cursor-pointer"
              title="Centralizar no motorista"
            >
              <Crosshair className="w-4 h-4" />
            </button>

            <button
              type="button"
              onClick={handleViewFullRoute}
              className="pointer-events-auto w-9 h-9 bg-white hover:bg-slate-50 border border-slate-300 active:scale-95 text-slate-800 hover:text-[#ff6a00] rounded-xl shadow-lg flex items-center justify-center transition-all cursor-pointer"
              title="Ver percurso inteiro no mapa"
            >
              <Route className="w-4 h-4" />
            </button>
          </>
        )}
      </div>

      {/* MAPA FULLSCREEN LEAFLET LIMPO */}
      <div
        ref={mapContainerRef}
        className="w-full h-full flex-1 z-0 bg-white touch-none [&_.leaflet-top]:!top-14"
        style={{ width: '100vw', height: '100vh', background: '#ffffff', touchAction: 'none' }}
      />

      {/* 3. CARD PEQUENO EMBAIXO SOMENTE DEPOIS QUE O MOTORISTA / MOTOBOY ACEITAR (APENAS DADOS DELE + CÓDIGO 4 DÍGITOS) */}
      {!isSearching && (
        <div className="fixed bottom-4 left-3 right-3 max-w-md mx-auto z-[900] pointer-events-none">
          <div className="pointer-events-auto bg-white/95 backdrop-blur-xl border-2 border-[#ff6a00] text-slate-900 rounded-2xl p-3 shadow-[0_8px_30px_rgba(0,0,0,0.22)] space-y-2.5">
            {/* Código de 4 dígitos para iniciar a corrida (compacto, somente após aceite) */}
            <div className="bg-amber-300 border border-amber-500 rounded-xl px-3 py-1.5 flex items-center justify-between gap-2 shadow-xs">
              <div className="flex items-center gap-2 min-w-0">
                <ShieldCheck className="w-4 h-4 text-slate-950 shrink-0" />
                <div className="leading-tight">
                  <span className="text-[10px] font-heading font-black text-slate-900 uppercase block">
                    Código para iniciar corrida
                  </span>
                  <span className="font-mono font-black text-xl text-slate-950 tracking-[0.2em] select-text">
                    {displayConfirmationCode}
                  </span>
                </div>
              </div>
              <button
                type="button"
                onClick={handleCopyConfirmationCode}
                className="pointer-events-auto px-2.5 py-1 bg-slate-950 hover:bg-slate-800 active:scale-95 text-white font-heading font-black text-[11px] rounded-lg cursor-pointer shrink-0 flex items-center gap-1"
              >
                {copiedRideCode ? (
                  <>
                    <Check className="w-3 h-3 text-emerald-400" />
                    <span>Copiado</span>
                  </>
                ) : (
                  <span>Copiar</span>
                )}
              </button>
            </div>

            {/* Foto + Nome do Motorista/Motoboy + Veículo (Carro/Moto, Modelo, Cor, Placa) + Chega em X min */}
            <div className="flex items-center justify-between gap-2.5">
              <div className="flex items-center gap-2.5 min-w-0 flex-1">
                <div className="relative shrink-0">
                  {displayDriverAvatar ? (
                    <img
                      src={displayDriverAvatar}
                      alt={effectiveDriver.name}
                      className="w-14 h-14 rounded-full object-cover border-2 border-[#ff6a00] shadow-sm"
                    />
                  ) : (
                    <div className="w-14 h-14 rounded-full bg-[#ff6a00]/15 text-[#ff6a00] border-2 border-[#ff6a00] flex flex-col items-center justify-center font-heading font-black text-lg shadow-sm">
                      <span>{(effectiveDriver.name || 'M').charAt(0).toUpperCase()}</span>
                      <User className="w-3.5 h-3.5 opacity-75" />
                    </div>
                  )}
                  {effectiveDriver.rating > 0 && (
                    <span className="absolute -bottom-1 -right-1 bg-amber-400 text-slate-950 font-black text-[9px] px-1 rounded-full border border-black shadow">
                      ★ {effectiveDriver.rating.toFixed(1)}
                    </span>
                  )}
                </div>

                <div className="min-w-0 flex-1 space-y-0.5">
                  <div className="flex items-center gap-1.5 flex-wrap">
                    <h4 className="font-heading font-black text-sm text-slate-950 truncate">
                      {effectiveDriver.name}
                    </h4>
                    <span className="text-[10px] font-mono font-black bg-emerald-100 text-emerald-900 px-1.5 py-0.5 rounded border border-emerald-300 shrink-0">
                      {isRideFinished
                        ? 'Chegou'
                        : hasDriverArrived || minutesLeft <= 0
                        ? 'No local'
                        : `Chega em ${minutesLeft} min`}
                    </span>
                  </div>
                  <p className="text-xs text-slate-700 font-bold truncate">
                    {isMotoboy ? 'Moto' : 'Carro'} • {effectiveDriver.vehicleModel || (isMotoboy ? 'Motocicleta' : 'Automóvel')}
                    {effectiveDriver.vehicleColor ? ` • ${effectiveDriver.vehicleColor}` : ''}
                    {effectiveDriver.vehiclePlate ? ` • ${effectiveDriver.vehiclePlate}` : ''}
                  </p>
                </div>
              </div>

              <div className="text-right shrink-0">
                <div className="text-xs font-heading font-black text-[#ff6a00]">
                  {isRideFinished ? 'Chegou!' : `${distanceKmFormatted} km`}
                </div>
              </div>
            </div>

            {/* Aviso quando chegar ou finalizar */}
            {hasDriverArrived && !isRideFinished && (
              <div className="bg-emerald-50 border border-emerald-300 rounded-xl px-2.5 py-1.5 flex items-center justify-between gap-2">
                <span className="text-xs font-heading font-black text-emerald-900 flex items-center gap-1.5">
                  <CheckCircle2 className="w-4 h-4 text-emerald-600 shrink-0" />
                  <span>{isMotoboy ? 'Seu motoboy chegou!' : 'Seu motorista chegou!'}</span>
                </span>
                <button
                  type="button"
                  onClick={() => {
                    setIsRideInProgress(false);
                    setIsRideFinished(true);
                    setDistanceRemainingMeters(0);
                    setSecondsRemaining(0);
                    if (onCompleteRide) onCompleteRide();
                  }}
                  className="pointer-events-auto py-1 px-2.5 bg-emerald-600 hover:bg-emerald-500 text-white font-bold text-[11px] rounded-lg cursor-pointer shrink-0"
                >
                  Finalizar
                </button>
              </div>
            )}

            {isRideFinished ? (
              <button
                type="button"
                onClick={() => {
                  if (onCompleteRide) onCompleteRide();
                  onClose();
                }}
                className="pointer-events-auto w-full py-2.5 px-3 bg-[#ff6a00] hover:bg-[#e05e00] text-white font-heading font-black text-xs rounded-xl shadow-md transition-all cursor-pointer flex items-center justify-center gap-1.5 uppercase tracking-wide"
              >
                <span>⭐ Avaliar motorista agora</span>
              </button>
            ) : (
              <div className="grid grid-cols-2 gap-2 pt-1 border-t border-slate-200">
                {effectiveDriver.phone ? (
                  <a
                    href={`tel:${effectiveDriver.phone.replace(/\D/g, '')}`}
                    className="pointer-events-auto py-2 px-2.5 bg-emerald-600 hover:bg-emerald-500 active:scale-95 text-white font-heading font-black text-xs rounded-xl shadow-xs flex items-center justify-center gap-1.5 transition-all cursor-pointer"
                  >
                    <Phone className="w-3.5 h-3.5 shrink-0" />
                    <span className="truncate">Ligar para motorista</span>
                  </a>
                ) : (
                  <button
                    type="button"
                    onClick={() => {
                      setAudioToast('Telefone do motorista indisponível');
                      setTimeout(() => setAudioToast(null), 2500);
                    }}
                    className="pointer-events-auto py-2 px-2.5 bg-emerald-600/80 hover:bg-emerald-600 active:scale-95 text-white font-heading font-black text-xs rounded-xl shadow-xs flex items-center justify-center gap-1.5 transition-all cursor-pointer"
                  >
                    <Phone className="w-3.5 h-3.5 shrink-0" />
                    <span className="truncate">Ligar para motorista</span>
                  </button>
                )}

                <button
                  type="button"
                  onClick={onCancelRide}
                  className="pointer-events-auto py-2 px-2.5 bg-red-600 hover:bg-red-700 active:scale-95 text-white font-heading font-black text-xs rounded-xl shadow-xs flex items-center justify-center gap-1.5 transition-all cursor-pointer"
                >
                  <XCircle className="w-3.5 h-3.5 shrink-0" />
                  <span className="truncate">Cancelar Corrida</span>
                </button>
              </div>
            )}
          </div>
        </div>
      )}
    </div>
  );
};
