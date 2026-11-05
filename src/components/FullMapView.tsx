import React, { useEffect, useRef, useState } from 'react';
import L from 'leaflet';
import { Driver, LocationPoint, Ride } from '../types';
import { calculateDistanceKm } from '../services/addressSearchService';
import { 
  ArrowLeft, 
  Crosshair, 
  Navigation, 
  ShieldCheck, 
  Phone, 
  Clock, 
  MapPin, 
  Car,
  Star
} from 'lucide-react';

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
  const routePolylineRef = useRef<L.Polyline | null>(null);

  // Fallback pickup point: Av. Paulista, 1578
  const defaultPickupLat = pickup?.lat ?? -23.5615;
  const defaultPickupLng = pickup?.lng ?? -46.6558;

  // Driver details: from activeRide, activeDriver or realistic simulation
  const effectiveDriver: Driver = activeRide?.driver || activeDriver || {
    id: 'drv-sim',
    name: 'Marcos Silva',
    avatar: 'https://images.unsplash.com/photo-1534528741775-53994a69daeb?w=150&auto=format&fit=crop&q=80',
    phone: '(11) 98721-4321',
    email: 'motorista@race.com',
    cpf: '000.***.***-00',
    cnh: '01234567890',
    category: 'economica',
    vehicleModel: 'Chevrolet Onix Plus',
    vehiclePlate: 'BRA2E19',
    vehicleColor: 'Prata',
    vehicleYear: 2024,
    rating: 4.98,
    totalRides: 1420,
    status: 'online',
    lat: defaultPickupLat + 0.0095,
    lng: defaultPickupLng - 0.0085,
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

  // Car position state: initializes at starting offset ~1.2 km away
  const [carPos, setCarPos] = useState<{ lat: number; lng: number }>(() => {
    if (driverPosition) return driverPosition;
    if (effectiveDriver.lat && effectiveDriver.lng) {
      return { lat: effectiveDriver.lat, lng: effectiveDriver.lng };
    }
    return { lat: defaultPickupLat + 0.0095, lng: defaultPickupLng - 0.0085 };
  });

  const [etaText, setEtaText] = useState('Chega em 3 min - 1.2km');

  // Initialize Fullscreen Leaflet Map
  useEffect(() => {
    if (!mapContainerRef.current) return;

    if (!mapInstanceRef.current) {
      const map = L.map(mapContainerRef.current, {
        center: [carPos.lat, carPos.lng],
        zoom: 15,
        zoomControl: false,
      });

      // CartoDB Dark Matter tiles for sleek black & orange visual
      L.tileLayer('https://{s}.basemaps.cartocdn.com/dark_all/{z}/{x}/{y}{r}.png', {
        attribution: '&copy; OpenStreetMap &copy; CARTO',
        subdomains: 'abcd',
        maxZoom: 19,
      }).addTo(map);

      // Zoom control bottom right
      L.control.zoom({ position: 'bottomright' }).addTo(map);

      mapInstanceRef.current = map;
    }

    return () => {
      if (mapInstanceRef.current) {
        mapInstanceRef.current.remove();
        mapInstanceRef.current = null;
      }
    };
  }, []);

  // Update pickup marker
  useEffect(() => {
    const map = mapInstanceRef.current;
    if (!map) return;

    const pickupLat = pickup?.lat ?? defaultPickupLat;
    const pickupLng = pickup?.lng ?? defaultPickupLng;

    const pickupHtml = `
      <div class="relative flex flex-col items-center">
        <div class="w-8 h-8 rounded-full bg-emerald-500 text-black font-black flex items-center justify-center border-2 border-white shadow-2xl text-xs">
          👤
        </div>
        <div class="bg-black/90 text-white text-[10px] px-2 py-0.5 rounded-md border border-emerald-500 mt-1 font-bold whitespace-nowrap shadow-xl">
          Seu Embarque
        </div>
      </div>
    `;

    const pickupIcon = L.divIcon({
      className: 'pickup-full-marker',
      html: pickupHtml,
      iconSize: [36, 44],
      iconAnchor: [18, 22],
    });

    if (pickupMarkerRef.current) {
      pickupMarkerRef.current.setLatLng([pickupLat, pickupLng]);
    } else {
      pickupMarkerRef.current = L.marker([pickupLat, pickupLng], { icon: pickupIcon }).addTo(map);
    }
  }, [pickup]);

  // Update Driver Marker, Route Polyline (laranja #ff6a00) and ETA
  useEffect(() => {
    const map = mapInstanceRef.current;
    if (!map) return;

    const pickupLat = pickup?.lat ?? defaultPickupLat;
    const pickupLng = pickup?.lng ?? defaultPickupLng;

    // Driver Marker with animated pulsing ping
    const driverHtml = `
      <div class="relative flex items-center justify-center">
        <div class="absolute w-12 h-12 rounded-full bg-[#ff6a00]/30 animate-ping"></div>
        <div class="relative w-10 h-10 rounded-full shadow-2xl bg-[#ff6a00] border-2 border-white flex items-center justify-center text-white text-lg">
          🚗
        </div>
        <span class="absolute -bottom-6 text-[10px] whitespace-nowrap bg-black text-white px-2 py-0.5 rounded font-mono font-bold border border-zinc-700 shadow-xl">
          ${effectiveDriver.vehiclePlate}
        </span>
      </div>
    `;

    const driverIcon = L.divIcon({
      className: 'driver-full-marker',
      html: driverHtml,
      iconSize: [40, 40],
      iconAnchor: [20, 20],
    });

    if (driverMarkerRef.current) {
      driverMarkerRef.current.setLatLng([carPos.lat, carPos.lng]);
    } else {
      driverMarkerRef.current = L.marker([carPos.lat, carPos.lng], { icon: driverIcon }).addTo(map);
    }

    // Curva suave da rota do motorista até o passageiro com linha laranja #ff6a00
    const midLat = (carPos.lat + pickupLat) / 2 + 0.0012;
    const midLng = (carPos.lng + pickupLng) / 2 - 0.0018;

    const routePoints: [number, number][] = [
      [carPos.lat, carPos.lng],
      [midLat, midLng],
      [pickupLat, pickupLng],
    ];

    if (routePolylineRef.current) {
      routePolylineRef.current.setLatLngs(routePoints);
    } else {
      routePolylineRef.current = L.polyline(routePoints, {
        color: '#ff6a00',
        weight: 6,
        opacity: 0.95,
        lineCap: 'round',
        lineJoin: 'round',
      }).addTo(map);
    }

    // Calcula distância restante e ETA em tempo real
    const distKm = calculateDistanceKm(carPos.lat, carPos.lng, pickupLat, pickupLng);
    if (distKm <= 0.08) {
      setEtaText('Motorista chegou ao ponto de embarque!');
    } else {
      const etaMin = Math.max(1, Math.round(distKm * 2.5));
      setEtaText(`Chega em ${etaMin} min - ${distKm.toFixed(1)}km`);
    }
  }, [carPos, pickup]);

  // 3. Animação do carro andando: o marcador do motorista se move a cada 2 segundos em direção ao ponto de embarque
  useEffect(() => {
    const pickupLat = pickup?.lat ?? defaultPickupLat;
    const pickupLng = pickup?.lng ?? defaultPickupLng;

    let step = 0;
    const totalSteps = 45; // ~90 segundos para chegar
    const startLat = carPos.lat;
    const startLng = carPos.lng;

    const interval = setInterval(() => {
      step += 1;
      const progress = Math.min(step / totalSteps, 1);
      const nextLat = startLat + (pickupLat - startLat) * progress;
      const nextLng = startLng + (pickupLng - startLng) * progress;

      setCarPos({ lat: nextLat, lng: nextLng });
      if (onUpdateDriverPosition) {
        onUpdateDriverPosition({ lat: nextLat, lng: nextLng });
      }

      if (progress >= 1) {
        clearInterval(interval);
      }
    }, 2000); // 2 segundos conforme requisito

    return () => clearInterval(interval);
  }, []);

  // Botão "Centralizar" para seguir o carro
  const handleCenterOnCar = () => {
    if (!mapInstanceRef.current) return;
    mapInstanceRef.current.setView([carPos.lat, carPos.lng], 16, { animate: true });
  };

  return (
    <div className="fixed inset-0 z-50 bg-[#000000] text-white flex flex-col w-screen h-screen overflow-hidden select-none">
      {/* Botão VOLTAR laranja no topo esquerdo */}
      <button
        type="button"
        onClick={onClose}
        className="absolute top-4 left-4 z-[1000] bg-[#ff6a00] hover:bg-[#e05e00] active:scale-95 text-white font-heading font-black text-sm py-3 px-5 rounded-2xl shadow-2xl flex items-center gap-2 transition-all cursor-pointer border border-[#ff8533]"
      >
        <ArrowLeft className="w-5 h-5 stroke-[3]" />
        <span>VOLTAR</span>
      </button>

      {/* Badge GPS no topo direito */}
      <div className="absolute top-4 right-4 z-[1000] bg-black/85 backdrop-blur-md border border-zinc-800 text-white px-4 py-2.5 rounded-2xl flex items-center gap-2.5 shadow-2xl">
        <span className="w-3 h-3 rounded-full bg-emerald-500 radar-pulse" />
        <span className="text-xs font-mono font-bold text-zinc-200 uppercase tracking-wider">
          GPS ao Vivo (2s)
        </span>
      </div>

      {/* Mapa Leaflet Grande Ocupando 100% da Altura */}
      <div ref={mapContainerRef} className="w-full h-full flex-1 z-0" />

      {/* Card Embaixo: Foto motorista, nome, placa, "Chega em 3 min - 1.2km" e Botão Centralizar */}
      <div className="absolute bottom-6 left-3 right-3 sm:left-6 sm:right-6 max-w-xl mx-auto z-[1000]">
        <div className="bg-[#0a0a0a]/95 backdrop-blur-xl border-2 border-zinc-800 rounded-3xl p-5 shadow-2xl space-y-4">
          {/* Topo do Card: Informações do Motorista e Tempo de Chegada */}
          <div className="flex items-center justify-between gap-3">
            <div className="flex items-center gap-3.5">
              <div className="relative">
                <img
                  src={effectiveDriver.avatar}
                  alt={effectiveDriver.name}
                  className="w-14 h-14 rounded-2xl object-cover border-2 border-[#ff6a00] shadow-md"
                />
                <span className="absolute -bottom-1 -right-1 w-4 h-4 rounded-full bg-emerald-500 border-2 border-black" />
              </div>
              <div>
                <div className="flex items-center gap-2">
                  <h3 className="font-heading font-black text-white text-base sm:text-lg">
                    {effectiveDriver.name}
                  </h3>
                  <span className="text-xs font-black bg-amber-500/20 text-[#ff6a00] px-2 py-0.5 rounded-md border border-[#ff6a00]/30 flex items-center gap-1">
                    <Star className="w-3 h-3 fill-[#ff6a00]" />
                    {effectiveDriver.rating.toFixed(2)}
                  </span>
                </div>
                <p className="text-xs sm:text-sm text-zinc-400 font-mono mt-0.5">
                  {effectiveDriver.vehicleModel} &bull;{' '}
                  <strong className="text-white font-mono bg-zinc-800 px-1.5 py-0.5 rounded border border-zinc-700">
                    {effectiveDriver.vehiclePlate}
                  </strong>
                </p>
              </div>
            </div>

            {/* Destaque Chega em 3 min - 1.2km */}
            <div className="text-right">
              <span className="text-[11px] font-mono uppercase tracking-wider text-zinc-400 block font-bold">
                Previsão
              </span>
              <span className="text-sm sm:text-base font-heading font-black text-[#ff6a00] whitespace-nowrap block animate-pulse">
                {etaText}
              </span>
            </div>
          </div>

          {/* Linha de Embarque */}
          <div className="flex items-center gap-2 bg-[#141414] px-3.5 py-2 rounded-xl border border-zinc-800 text-xs text-zinc-300">
            <MapPin className="w-4 h-4 text-emerald-400 shrink-0" />
            <span className="truncate">
              {pickup?.address || 'Av. Paulista, 1578 - Ponto de Embarque'}
            </span>
          </div>

          {/* Botões de Ação: Centralizar no Carro + Ligar */}
          <div className="flex items-center gap-2.5 pt-1">
            <button
              type="button"
              onClick={handleCenterOnCar}
              className="flex-1 bg-[#ff6a00] hover:bg-[#e05e00] active:scale-95 text-white font-heading font-black py-3 px-4 rounded-xl shadow-lg transition-all cursor-pointer flex items-center justify-center gap-2 text-sm uppercase tracking-wider border border-[#ff8533]"
            >
              <Crosshair className="w-4 h-4 stroke-[2.5]" />
              <span>Centralizar no Carro</span>
            </button>

            <a
              href={`tel:${effectiveDriver.phone || '11987214321'}`}
              className="bg-zinc-800 hover:bg-zinc-700 active:scale-95 text-white font-bold p-3 rounded-xl border border-zinc-700 transition-all cursor-pointer flex items-center justify-center shadow"
              title="Ligar para o Motorista"
            >
              <Phone className="w-5 h-5 text-emerald-400" />
            </a>
          </div>
        </div>
      </div>
    </div>
  );
};
